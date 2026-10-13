import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendSuccess } from "../../utils/sendResponse";
import * as productTypeService from "./product-type.service";
import type {
  CreateProductTypeInput,
  ListProductTypesQuery,
  UpdateProductTypeInput,
} from "./product-type.validation";

export const listProductTypes = catchAsync(async (req, res) => {
  const { productTypes, meta } = await productTypeService.listProductTypes(
    req.query as unknown as ListProductTypesQuery,
  );
  sendSuccess(res, {
    message: "Product types fetched successfully",
    data: { productTypes },
    meta,
  });
});

export const createProductType = catchAsync(async (req, res) => {
  const productType = await productTypeService.createProductType(
    req.body as CreateProductTypeInput,
  );
  sendSuccess(res, {
    statusCode: httpStatus.CREATED,
    message: "Product type created successfully",
    data: { productType },
  });
});

export const updateProductType = catchAsync(async (req, res) => {
  const productType = await productTypeService.updateProductType(
    String(req.params.id),
    req.body as UpdateProductTypeInput,
  );
  sendSuccess(res, { message: "Product type updated successfully", data: { productType } });
});

export const deleteProductType = catchAsync(async (req, res) => {
  await productTypeService.deleteProductType(String(req.params.id));
  sendSuccess(res, { message: "Product type deleted successfully" });
});
