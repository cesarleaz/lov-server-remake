import mongoose from 'mongoose';

const billingSchema = new mongoose.Schema({
  owner_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  balance: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'credits'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  collection: 'billing'
});

export const Billing = mongoose.model('Billing', billingSchema);
