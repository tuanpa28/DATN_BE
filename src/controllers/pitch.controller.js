import { badRequest } from "../formatResponse/badRequest";
import { serverError } from "../formatResponse/serverError";
import { successfully } from "../formatResponse/successfully";
import { pitchService } from "../services";
import { pitchValidation } from "../validations";
import fs from "fs";
const locationJson = JSON.parse(fs.readFileSync("locations.json"));

export const getAll = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 7,
      _sort = "createdAt",
      _order = "asc",
      districtId,
      wardId,
      searchText,
      minPrice,
      maxPrice,
      ...params
    } = req.query;

    const options = {
      page,
      limit,
      sort: {
        [_sort]: _order === "desc" ? -1 : 1,
      },
      ...params,
      customLabels: {
        docs: "data",
      },
    };
    const pitchs = await pitchService.getAllPitch(options);

    if (!pitchs || pitchs.length === 0) {
      return res.status(404).json(badRequest(404, "Không có dữ liệu!"));
    }

    const { data: dataPitch, ...pagi } = pitchs;
    let data = {};
    if (districtId) {
      const wardIdsInDistricts = locationJson.wards
        .filter((ward) => ward.parent === districtId)
        .map((ward) => ward.id);

      const newPitchs = pitchs.data.filter((item) =>
        wardIdsInDistricts.includes(item.location_id)
      );
      data.data = newPitchs;
    } else if (wardId) {
      const newPitchs = pitchs.data.filter(
        (item) => item.location_id === wardId
      );
      data.data = newPitchs;
    } else {
      data.data = dataPitch;
    }
    // tìm kiếm theo tên và lọc theo giá
    if (searchText && (minPrice || maxPrice)) {
      const filteredPitchs = data.data.filter((item) => {
        const isNameMatched = item.name
          .toLowerCase()
          .includes(searchText.toLowerCase());
        const isPriceMatched =
          (!minPrice || item.deposit_price >= minPrice) &&
          (!maxPrice || item.deposit_price <= maxPrice);
        return isNameMatched && isPriceMatched;
      });
      data.data = filteredPitchs;
    } else if (searchText) {
      const filteredPitchs = data.data.filter((item) =>
        item.name.toLowerCase().includes(searchText.toLowerCase())
      );
      data.data = filteredPitchs;
    } else if (minPrice || maxPrice) {
      const filteredPitchs = data.data.filter(
        (item) =>
          (!minPrice || item.deposit_price >= minPrice) &&
          (!maxPrice || item.deposit_price <= maxPrice)
      );
      data.data = filteredPitchs;
    }

    res
      .status(200)
      .json(successfully({ ...data, ...pagi }, "Lấy dữ liệu thành công"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};

// filter Feedback Pitch
export const filterFeedBack = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 7,
      _sort = "createdAt",
      _order = "asc",
      minStart,
      maxStart,
      ...params
    } = req.query;

    const options = {
      page,
      limit,
      sort: {
        [_sort]: _order === "desc" ? -1 : 1,
      },
      ...params,
      customLabels: {
        docs: "data",
      },
    };

    const pitchs = await pitchService.filterFeedbackPitch(options);

    if (!pitchs || pitchs.length === 0) {
      return res.status(404).json(badRequest(404, "Không có dữ liệu!"));
    }

    const { data: dataPitch, ...pagi } = pitchs;
    const pitchesWithStars = pitchs.data.map((pitch) => {
      // Tính tổng quantity_star
      const totalStars = pitch.feedback_id.reduce((sum, feedback) => sum + feedback.quantity_star, 0);

      // Tính trung bình cộng quantity_star
      const averageStars = pitch.feedback_id.length > 0 ? totalStars / pitch.feedback_id.length : 0;


      if (minStart || maxStart) {
        const isStarsMatched =
          (!minStart || averageStars >= minStart) &&
          (!maxStart || averageStars <= maxStart);

        if (!isStarsMatched) {
          return null;
        }
      }

      return {
        _id: pitch._id,
        address: pitch.address,
        name: pitch.name,
        admin_pitch_id: pitch.admin_pitch_id,
        numberPitch: pitch.numberPitch,
        images: pitch.images,
        description: pitch.description,
        shifts: pitch.shifts,
        services: pitch.services,
        location_id: pitch.location_id,
        deposit_price: pitch.deposit_price,
        avatar: pitch.avatar,
        comment_id: pitch.comment_id,
        feedback_id: pitch.feedback_id,
        districts_id: pitch.districts_id,
        createdAt: pitch.createdAt,
        updatedAt: pitch.updatedAt,
        averageStars: averageStars,
      };
    });

    // Lọc các pitch không thỏa mãn điều kiện
    const filteredPitches = pitchesWithStars.filter((pitch) => pitch !== null);

    res.status(200).json(successfully({ data: filteredPitches, ...pagi }, "Lấy dữ liệu thành công"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};




export const getById = async (req, res) => {
  try {
    const pitch = await pitchService.getOnePitch(req.params.id);

    if (!pitch) {
      return res.status(404).json(badRequest(404, "Không có dữ liệu!"));
    }

    res.status(200).json(successfully(pitch, "Lấy dữ liệu thành công"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};

export const create = async (req, res) => {
  try {
    const { error } = pitchValidation.default.validate(req.body);
    if (error) {
      return res.status(400).json(badRequest(400, error.details[0].message));
    }

    const pitch = await pitchService.creatPitch(req.body);
    if (!pitch) {
      return res.status(400).json(badRequest(400, "Thêm không thành công !!!"));
    }

    res.status(200).json(successfully(pitch, "Thêm thành công !!!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};

export const update = async (req, res) => {
  try {
    const { error } = pitchValidation.default.validate(req.body);
    if (error) {
      return res.status(400).json(badRequest(400, error.details[0].message));
    }
    const pitch = await pitchService.updatePitch({
      ...req.body,
      id: req.params.id,
    });
    if (!pitch) {
      return res.status(400).json(badRequest(400, "Sửa không thành công !!!"));
    }
    res.status(200).json(successfully(pitch, "Sửa thành công !!!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};

export const remove = async (req, res) => {
  try {
    const pitch = await pitchService.deletePitch(req.params.id);
    if (!pitch) {
      return res.status(400).json(badRequest(400, "Xóa không thành công !!!"));
    }

    res.status(200).json(successfully(pitch, "Xóa thành công !!!"));
  } catch (error) {
    res.status(500).json(serverError(error.message));
  }
};
