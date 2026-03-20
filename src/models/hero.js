import { model, Schema } from 'mongoose';

const heroSchema = new Schema(
  {
    version: {
      type: String,
      required: true,
      default: '1.0',
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    language: {
      type: String,
      default: 'uk',
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    fullName: {
      type: String,
      trim: true,
    },
    title: {
      type: String,
      trim: true,
    },
    description: {
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
      portraite: {
        type: String,
        trim: true,
        default:
          'https://res.cloudinary.com/kingdom-of-drama/image/upload/v1774017311/default-portraite_rqtzxw.webp',
      },
    },
    statuses: {
      isDraft: {
        type: Boolean,
        default: true,
      },
      isPablished: {
        type: Boolean,
        default: false,
      },
      isAlive: {
        type: Boolean,
        default: true,
      },
      isInShow: {
        type: Boolean,
        default: false,
      },
      isCannon: {
        type: Boolean,
        default: false,
      },
      isCandidate: {
        type: Boolean,
        default: false,
      },
    },
    basicInfo: {
      age: {
        type: String,
        trim: true,
      },
      sex: {
        type: String,
        trim: true,
      },
      height: {
        type: String,
        trim: true,
      },
      weight: {
        type: String,
        trim: true,
      },
      race: {
        type: String,
        trim: true,
      },
      birthDay: {
        type: String,
        trim: true,
      },
      room: {
        type: String,
        trim: true,
      },
    },
    attributes: {
      character: {
        type: String,
        trim: true,
      },
      credo: {
        type: String,
        trim: true,
      },
      fears: {
        type: String,
        trim: true,
      },
      dreams: {
        type: String,
        trim: true,
      },
      psychState: {
        type: String,
        trim: true,
      },
      addictions: {
        type: String,
        trim: true,
      },
      features: {
        type: String,
        trim: true,
      },
      habits: {
        type: String,
        trim: true,
      },
      health: {
        type: String,
        trim: true,
      },
      food: {
        type: String,
        trim: true,
      },
      weaknesses: {
        type: String,
        trim: true,
      },
      family: {
        type: String,
        trim: true,
      },
      relations: {
        type: String,
        trim: true,
      },
      reputation: {
        type: String,
        trim: true,
      },
      career: {
        type: String,
        trim: true,
      },
      history: {
        type: String,
        trim: true,
      },
      failures: {
        type: String,
        trim: true,
      },
      achievements: {
        type: String,
        trim: true,
      },
      education: {
        type: String,
        trim: true,
      },
      hobbies: {
        type: String,
        trim: true,
      },
      media: {
        type: String,
        trim: true,
      },
      travels: {
        type: String,
        trim: true,
      },
      animals: {
        type: String,
        trim: true,
      },
      worldview: {
        type: String,
        trim: true,
      },
      religionSpirituality: {
        type: String,
        trim: true,
      },
      politics: {
        type: String,
        trim: true,
      },
      ethics: {
        type: String,
        trim: true,
      },
      skills: {
        type: String,
        trim: true,
      },
      magic: {
        type: String,
        trim: true,
      },
      inventory: {
        type: String,
        trim: true,
      },
      technologies: {
        type: String,
        trim: true,
      },
    },
    media: [
      {
        type: Schema.Types.ObjectId,
        ref: 'HeroMedia',
      },
    ],
  },
  { timestamps: true, versionKey: false },
);

const Hero = model('Hero', heroSchema, 'heroes');
export default Hero;
