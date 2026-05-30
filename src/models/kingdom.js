import { model, Schema } from 'mongoose';

const kingdomSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    population: {
      type: Number,
    },
    language: {
      type: String,
      trim: true,
    },
    ruler: {
      type: String,
      trim: true,
    },
    images: {
      avatar: {
        type: String,
        trim: true,
        default:
          'https://res.cloudinary.com/kingdom-of-drama/image/upload/v1774017551/default-avatar_hbnxwy.webp',
      },
      portrait: {
        type: String,
        trim: true,
        default:
          'https://res.cloudinary.com/kingdom-of-drama/image/upload/v1774017311/default-portraite_rqtzxw.webp',
      },
    },
  },
  { timestamps: true, versionKey: false },
);

const Kingdom = model('Kingdom', kingdomSchema, 'kingdoms');

export default Kingdom;
