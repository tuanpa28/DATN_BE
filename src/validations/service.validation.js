import Joi from "joi";

const serviceSchema = Joi.object({
    admin_pitch_id: Joi.string().required(),
    name: Joi.string().required(),
    price: Joi.number().required(),
    image: Joi.string().required(),
});

export default serviceSchema;