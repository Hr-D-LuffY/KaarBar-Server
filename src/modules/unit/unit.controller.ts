import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendSuccess } from "../../utils/sendResponse";
import * as unitService from "./unit.service";
import type { CreateUnitInput, ListUnitsQuery, UpdateUnitInput } from "./unit.validation";

export const listUnits = catchAsync(async (req, res) => {
  const { units, meta } = await unitService.listUnits(req.query as unknown as ListUnitsQuery);
  sendSuccess(res, { message: "Units fetched successfully", data: { units }, meta });
});

export const createUnit = catchAsync(async (req, res) => {
  const unit = await unitService.createUnit(req.body as CreateUnitInput);
  sendSuccess(res, {
    statusCode: httpStatus.CREATED,
    message: "Unit created successfully",
    data: { unit },
  });
});

export const updateUnit = catchAsync(async (req, res) => {
  const unit = await unitService.updateUnit(String(req.params.id), req.body as UpdateUnitInput);
  sendSuccess(res, { message: "Unit updated successfully", data: { unit } });
});

export const deleteUnit = catchAsync(async (req, res) => {
  await unitService.deleteUnit(String(req.params.id));
  sendSuccess(res, { message: "Unit deleted successfully" });
});
