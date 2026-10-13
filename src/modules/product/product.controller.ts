import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { getShopContext } from "../../utils/request-context";
import { sendSuccess } from "../../utils/sendResponse";
import * as productService from "./product.service";
import type {
  CreateProductInput,
  ListCatalogQuery,
  ListProductsQuery,
  ProductOptionsQuery,
  UpdateLowStockLevelInput,
  UpdateProductInput,
} from "./product.validation";

export const listCatalog = catchAsync(async (req, res) => {
  const { shopId } = getShopContext(req);
  const { products, meta } = await productService.listCatalog(
    shopId,
    req.query as unknown as ListCatalogQuery,
  );
  sendSuccess(res, { message: "Catalog fetched successfully", data: { products }, meta });
});

export const listProducts = catchAsync(async (req, res) => {
  const { shopId } = getShopContext(req);
  const { products, meta } = await productService.listProducts(
    shopId,
    req.query as unknown as ListProductsQuery,
  );
  sendSuccess(res, { message: "Products fetched successfully", data: { products }, meta });
});

export const getProductOptions = catchAsync(async (req, res) => {
  const { shopId } = getShopContext(req);
  const options = await productService.getProductOptions(
    shopId,
    req.query as unknown as ProductOptionsQuery,
  );
  sendSuccess(res, { message: "Product options fetched successfully", data: options });
});

export const getProduct = catchAsync(async (req, res) => {
  const { shopId } = getShopContext(req);
  const product = await productService.getProduct(shopId, String(req.params.id));
  sendSuccess(res, { message: "Product fetched successfully", data: { product } });
});

export const createProduct = catchAsync(async (req, res) => {
  const { shopId } = getShopContext(req);
  const product = await productService.createProduct(shopId, req.body as CreateProductInput);
  sendSuccess(res, {
    statusCode: httpStatus.CREATED,
    message: "Product created successfully",
    data: { product },
  });
});

export const addProductToShop = catchAsync(async (req, res) => {
  const { shopId } = getShopContext(req);
  const product = await productService.addProductToShop(shopId, String(req.params.id));
  sendSuccess(res, {
    statusCode: httpStatus.CREATED,
    message: "Product added to your shop successfully",
    data: { product },
  });
});

export const updateProduct = catchAsync(async (req, res) => {
  const product = await productService.updateProduct(
    String(req.params.id),
    req.body as UpdateProductInput,
  );
  sendSuccess(res, { message: "Product updated successfully", data: { product } });
});

export const updateLowStockLevel = catchAsync(async (req, res) => {
  const { shopId } = getShopContext(req);
  const product = await productService.updateLowStockLevel(
    shopId,
    String(req.params.id),
    req.body as UpdateLowStockLevelInput,
  );
  sendSuccess(res, { message: "Low stock level updated successfully", data: { product } });
});

export const removeProductFromShop = catchAsync(async (req, res) => {
  const { shopId } = getShopContext(req);
  await productService.removeProductFromShop(shopId, String(req.params.id));
  sendSuccess(res, { message: "Product removed from your shop successfully" });
});
