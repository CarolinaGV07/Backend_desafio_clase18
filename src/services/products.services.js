import ProductDTO from "../DTO/products.dto.js";
import CustomError from "../errors/CustomError.js";
import EErrors from "../errors/enums.js";
import { generateProductsErrorInfo } from "../errors/info.js";

export default class ProductRepository {
  constructor(productDAO, userDAO) {
    this.productDAO = productDAO;
    this.userDAO = userDAO;
  }
  async addProduct(data) {
    try {
      const productExist = await this.productDAO.getProductByCode(data.code);
      if (productExist) {
        CustomError.createError({
          name: "Error por producto ya existente",
          message: "Product already exists",
          code: EErrors.PRODUCT_ALREADY_EXISTS,
          info: generateProductsErrorInfo(productExist),
        });
      }
      const product = await this.productDAO.addProduct(data);
      return product;
    } catch (error) {
      CustomError.createError({
        name: "Error al agregar el producto",
        message: "error al crear el producto",
        code: EErrors.PRODUCT_ERROR,
        info: generateProductsErrorInfo(error),
      });
    }
  }
  async getProducts() {
    try {
      const products = await this.productDAO.getProducts();
      return products;
    } catch (error) {
      CustomError.createError({
        name: "Error al obtener el producto",
        message: "error al obtener el producto",
        code: EErrors.PRODUCT_NOT_FOUND,
        info: generateProductsErrorInfo(error),
      });
    }
  }
  async getProductById(id) {
    try {
      const product = await this.productDAO.getProductById(id);
      return product;
    } catch (error) {
      CustomError.createError({
        name: "Error al obtener el producto",
        message: "error al obtener el producto",
        code: EErrors.PRODUCT_NOT_FOUND,
        info: generateProductsErrorInfo(error),
      });
    }
  }
  async updateProduct(id, data) {
    try {
      const product = await this.productDAO.updateProduct(id, data);
      return new ProductDTO(product);
    } catch (error) {
      CustomError.createError({
        name: "Error al actualizar el producto",
        message: "error al actualizar el producto",
        code: EErrors.PRODUCT_NOT_UPDATE,
        info: generateProductsErrorInfo(error),
      });
    }
  }
  async deleteProduct(id) {
    try {
      const product = await this.productDAO.deleteProduct(id);
      return new ProductDTO(product);
    } catch (error) {
      CustomError.createError({
        name: "Error al actualizar el producto",
        message: "error al actualizar el producto",
        code: EErrors.PRODUCT_NOT_DELETE,
        info: generateProductsErrorInfo(error),
      });
    }
  }

  async getProductsPaginate(page, limit, queryParams, sort) {
    try {
      const products = await this.productDAO.getProductsPaginate(
        page,
        limit,
        queryParams,
        sort
      );
      const productsPrev = products.productsPrev;
      const productsNext = products.productsNext;
      const parametrosAnterior = new URLSearchParams(productsPrev);
      const paginaAnterior = parametrosAnterior.get("page");
      const parametrosPosterior = new URLSearchParams(productsNext);
      const paginaSiguiente = parametrosPosterior.get("page");
      let productsPaginate = products.productsPaginate;
      productsPaginate = productsPaginate.filter(
        (product) => product.stock > 0
      );
      return {
        productsPaginate,
        productsPrev,
        productsNext,
        paginaAnterior,
        paginaSiguiente,
      };
    } catch (e) {
      CustomError.createError({
        name: "Error al obtener el producto",
        message: "error al obtener el producto",
        code: EErrors.PRODUCT_NOT_FOUND,
        info: generateProductsErrorInfo(error),
      });
    }
  }

  async getProductsLimit(limit) {
    try {
      const products = await this.productDAO.getProductsLimit(limit);
      return products.map((product) => new ProductDTO(product));
    } catch (error) {
      CustomError.createError({
        name: "Error al obtener el producto",
        message: "error al obtener el producto",
        code: EErrors.PRODUCT_NOT_FOUND,
        info: generateProductsErrorInfo(error),
      });
    }
  }
}
