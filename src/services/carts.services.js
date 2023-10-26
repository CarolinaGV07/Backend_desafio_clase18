import CartDTO from "../DTO/carts.dto.js";
import mongoose from "mongoose";
import { v4 } from "uuid";
import moment from "moment";
import CustomError from "../errors/CustomError.js";
import EErrors from "../errors/enums.js";
import {
  generateCartErrorInfo,
  generateTicketErrorInfo,
  generateProductsErrorInfo,
} from "../errors/info.js";

export default class CartRepository {
  constructor(cartDAO, userDAO, productDAO, ticketDAO) {
    this.cartDAO = cartDAO;
    this.userDAO = userDAO;
    this.productDAO = productDAO;
    this.ticketDAO = ticketDAO;
  }
  async createCart() {
    try {
      const cart = await this.cartDAO.createCart();
      return cart;
    } catch (error) {
      CustomError.createError({
        name: "Error al crear el carrito",
        message: "No se pudo crear el carrito,intente nuevamente",
        code: EErrors.CART_NOT_CREATE,
        info: generateCartErrorInfo("No se pudo crear el carrito"),
      });
    }
  }
  async getCartById(id) {
    try {
      const cart = await this.cartDAO.getCartById(id);
      return new CartDTO(cart);
    } catch (error) {
      CustomError.createError({
        name: "Error al obtener el carrito",
        message: "No se pudo obtener el carrito,proporcione un ID válido",
        code: EErrors.CART_NOT_FOUND,
        info: generateCartErrorInfo("No se pudo obtener el carrito"),
      });
    }
  }
  async updateCartById(id, data) {
    try {
      const cart = await this.cartDAO.updateCartById(id, data);
      return cart();
    } catch (error) {
      CustomError.createError({
        name: "Error al actualizar el carrito",
        message: "No se pudo actualizar el carrito",
        code: EErrors.CART_NOT_UPDATE,
        info: generateCartErrorInfo("No se pudo actualizar el carrito"),
      });
    }
  }
  async deleteCartById(id) {
    try {
      const cart = await this.cartDAO.deleteCartById(id);
      return new CartDTO(cart);
    } catch (error) {
      CustomError.createError({
        name: "Error al eliminar el carrito",
        message: "No se pudo eliminar el carrito",
        code: EErrors.CART_NOT_DELETE,
        info: generateCartErrorInfo("No se pudo eliminar el carrito"),
      });
    }
  }
  async addProductCartByID(pid, quantity, user) {
    try {
      const userBD = await this.userDAO.getUserByEmail(user.email);
      let cartId = userBD.cartId[0];
      let cart;
      if (cartId) {
        cart = await this.cartDAO.getCartById(cartId);
      } else {
        cart = await this.cartDAO.createCart();
        userBD.cartId.push(cart._id);
        await this.userDAO.updateUser(userBD._id, userBD);
        cartId = cart._id;
      }
      const product = await this.productDAO.getProductById(pid);
      const productValidate = cart.products?.find(
        (product) => product.pid._id.toString() == pid.toString()
      );
      if (productValidate) {
        if (product.stock < quantity) {
          CustomError.createError({
            name: "Sin stock",
            message: "Stock not available",
            code: EErrors.STOCK_NOT_AVAILABLE,
            info: generateProductsErrorInfo(product),
          });
        }
        product.stock -= quantity;
        productValidate.quantity += quantity;
      } else {
        if (product.stock >= quantity) {
          product.stock -= quantity;
          cart.products.push({ pid, quantity });
          await this.cartDAO.updateCartById(cartId, cart);
        } else {
          CustomError.createError({
            name: "Sin stock",
            message: "Stock not available",
            code: EErrors.STOCK_NOT_AVAILABLE,
            info: generateProductsErrorInfo(product),
          });
        }
      }
      await this.cartDAO.updateCartById(cartId, cart);
      await this.productDAO.updateProduct(pid, product);
      return cart;
    } catch (error) {
      throw error;
    }
  }
  async deleteProductCartById(cid, pid) {
    try {
      const cartId = cid.toString();
      let cart = await this.cartDAO.getCartById(cartId);
      if (cart) {
        const productValidate = cart.products.find(
          (product) => product.pid.toString() == pid.toString()
        );
        if (productValidate) {
          await this.cartDao.updateCartById(
            { _id: cid },
            { $pull: { products: { pid: pid } } }
          );
          await cart.save();
          return cart;
        }
      } else {
        return null;
      }
    } catch (error) {
      CustomError.createError({
        name: "Error al eliminar el producto del carrito",
        message: "Error al eliminar el producto del carrito",
        code: EErrors.CART_NOT_DELETE_PRODUCT,
        info: generateProductsErrorInfo(error),
      });
    }
  }
  async clearCart(cid, pid) {
    try {
      const cart = await this.cartDAO.getCartById(cid);
      const products = cart.products;
      const updatedProducts = products.filter(
        (product) => product.pid._id.toString() !== pid.toString()
      );
      cart.products = updatedProducts;
      return cart; // Devuelve la instancia de carrito modificada
    } catch (error) {
      CustomError.createError({
        name: "Error al limpiar el carrito",
        message: "Error al limpiar el carrito",
        code: EErrors.CART_NOT_CLEAR,
        info: generateProductsErrorInfo(error),
      });
    }
  }

  async deleteProductOneCartById(user, pid) {
    const userBD = await this.userDAO.getUserByEmail(user.email);
    let cart = await this.cartDAO.getCartById(userBD.cartId[0]._id);
    const product = await this.productDAO.getProductById(pid);
    if (cart) {
      const productValidate = cart.products.find(
        (product) => product.pid._id == pid
      );
      if (productValidate) {
        productValidate.quantity -= 1;
        product.stock += 1;
        if (productValidate.quantity == 0) {
          cart = await this.clearCart(
            userBD.cartId[0]._id,
            productValidate.pid._id
          );
          await this.cartDAO.updateCartById(userBD.cartId[0]._id, cart);
        }
        await this.cartDAO.updateCartById(userBD.cartId[0]._id, cart);
        await this.productDAO.updateProduct(pid, product);
        return cart;
      }
      return null;
    } else {
      return null;
    }
  }
  async deleteProductsCart(cid) {
    try {
      const cart = await this.cartDAO.getCartById(cid);
      if (!cart) return null;
      await this.cartDAO.updateCartById(id, { product: [] });
      await cart.save();
    } catch (error) {
      CustomError.createError({
        name: "Error al eliminar productos del carrito",
        message: "Error al limpiar el carrito",
        code: EErrors.CART_NOT_CLEAR,
        info: generateProductsErrorInfo(error),
      });
    }
  }
  async updateProductCartById(cid, pid, quantity) {
    try {
      let cart = await this.cartDAO.getCartById(cid);
      const product = cart.products.find((product) => {
        product.pid._id.toString() == pid.toString();
      });
      if (!product) {
        cart.products.push({ pid, quantity });
      }
      product.quantity = quantity;
      await this.cartDAO.updateCartById(cid, cart);
      return new cart();
    } catch (error) {
      CustomError.createError({
        name: "Error al actualizar el producto del carrito",
        message: "Error al actualizar el producto del carrito",
        code: EErrors.CART_NOT_UPDATE,
        info: generateProductsErrorInfo(error),
      });
    }
  }

  async getCartUserById(user) {
    try {
      const userBD = await this.userDAO.getUserByEmail(user.email);
      let cart = userBD.cartId[0];
      if (!cart) {
        throw new Error("Cart not found");
      }
      const cartID = new mongoose.Types.ObjectId(cart);
      cart = await this.cartDAO.getCartById(cartID);
      let total = 0;
      cart.products.forEach((product) => {
        const subtotal = product.pid.price * product.quantity;
        product.total = subtotal;
        total = total + subtotal;
      });
      return { cart, total };
    } catch (error) {
      CustomError.createError({
        name: "Error al obtener el carrito del usuario",
        message: "Error al obtener el carrito del usuario",
        code: EErrors.CART_NOT_FOUND,
        info: generateProductsErrorInfo(error),
      });
    }
  }

  async getTicketCartUserById(user) {
    const { cart, total } = await this.getCartUserById(user);
    if (cart.products.length !== 0) {
      const products = { products: [] };
      await this.cartDAO.updateCartById(cart._id, products);
      const ticket = {
        code: v4(),
        purchase_datetime: new moment()
          .format("YYYY-MM-DD HH:mm:ss")
          .toString(),
        amount: total,
        purcharser: user.email,
      };
      await this.ticketDAO.addTicket(ticket);
      return ticket;
    } else {
      CustomError.createError({
        name: "Error",
        message: "Cart not products",
        code: EErrors.NOT_PRODUCTS_TICKET,
        info: generateTicketErrorInfo(""),
      });
    }
  }
}
