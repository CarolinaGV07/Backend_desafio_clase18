import { createHash, isValidPassword } from "../utils.js";
import UserDTO from "../DTO/user.dto.js";
import CustomError from "../errors/CustomError.js";
import EErrors from "../errors/enums.js";
import { generateUserErrorInfo } from "../errors/info.js";

export default class SessionServices {
  constructor(userDAO, cartDAO) {
    this.userDAO = userDAO;
    this.cartDAO = cartDAO;
  }

  async loginUser(user) {
    try {
      const userDB = await this.userDAO.getUserByEmail(user.email);
      if (!userDB) {
        CustomError.createError({
          name: "Error",
          message: "User not found by create error",
          code: EErrors.USER_NOT_FOUND,
          info: generateUserErrorInfo(user),
        });
      }
      if (!isValidPassword(userDB, user.password)) {
        CustomError.createError({
          name: "Error",
          message: "Password not valid",
          code: EErrors.PASSWORD_NOT_VALID,
          info: generateUserErrorInfo(user),
        });
      }
      return new UserDTO(userDB);
    } catch (e) {
      throw e;
    }
  }

  async registerUser(user) {
    if (await this.userDAO.getUserByEmail(user.email))
      CustomError.createError({
        name: "Error",
        message: "User already exist",
        code: EErrors.USER_ALREADY_EXISTS,
        info: generateUserErrorInfo(user.email),
      });
    user.password = createHash(user.password);
    if (user.email === "adminCoder@coder.com") {
      user.rol = "admin";
    } else {
      user.rol = "user";
    }
    const cart = await this.cartDAO.createCart();
    const newUser = await this.userDAO.createUser(user);
    newUser.cartId.push(cart._id);
    await this.userDAO.updateUser(newUser._id, newUser);
    return newUser;
  }

  async getUserCurrent(user) {
    return new UserDTO(user);
  }

  async getUserByEmail(email) {
    try {
      const user = await this.userDAO.getUserByEmail(email);
      if (!user) {
        CustomError.createError({
          name: "Error",
          message: "User not found by create error",
          code: EErrors.USER_NOT_FOUND,
          info: generateUserErrorInfo(user),
        });
      }
      return user;
    } catch (e) {
      throw e;
    }
  }
}
