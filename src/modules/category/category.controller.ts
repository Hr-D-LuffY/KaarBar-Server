import { catchAsync } from "../../utils/catchAsync";
import { sendSuccess } from "../../utils/sendResponse";
import * as categoryService from "./category.service";

export const listCategories = catchAsync(async (_req, res) => {
  const categories = await categoryService.listCategories();
  sendSuccess(res, { message: "Categories fetched successfully", data: { categories } });
});
