const express = require("express");
const mongoose = require("mongoose");
const Product = require("../models/Product");

const router = express.Router();

// POST /api/products - Create a product
router.post("/", async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ success: true, product });
  } catch (error) {
    next(error);
  }
});

// GET /api/products/low-stock - Products at or below reorder level
router.get("/low-stock", async (req, res, next) => {
  try {
    const lowStockItems = await Product.find({
      $expr: { $lte: ["$quantity", "$reorderLevel"] }
    }).sort({ quantity: 1 });

    res.json({ success: true, count: lowStockItems.length, lowStockItems });
  } catch (error) {
    next(error);
  }
});

// GET /api/products/summary - Category-wise inventory aggregation
router.get("/summary", async (req, res, next) => {
  try {
    const summary = await Product.aggregate([
      {
        $group: {
          _id: "$category",
          totalItems: { $sum: 1 },
          totalQuantity: { $sum: "$quantity" },
          totalStockValue: { $sum: { $multiply: ["$price", "$quantity"] } },
          avgPrice: { $avg: "$price" }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          category: "$_id",
          totalItems: 1,
          totalQuantity: 1,
          totalStockValue: { $round: ["$totalStockValue", 2] },
          avgPrice: { $round: ["$avgPrice", 2] }
        }
      }
    ]);

    res.json({ success: true, categories: summary.length, summary });
  } catch (error) {
    next(error);
  }
});

// GET /api/products - Filtering, sorting and pagination
router.get("/", async (req, res, next) => {
  try {
    const {
      category, search, minPrice, maxPrice,
      sort = "createdAt", order = "desc",
      page = 1, limit = 10
    } = req.query;

    const filter = {};
    if (category) filter.category = new RegExp(`^${escapeRegex(category)}$`, "i");
    if (search) {
      const safeSearch = escapeRegex(search);
      filter.$or = [
        { name: { $regex: safeSearch, $options: "i" } },
        { sku: { $regex: safeSearch, $options: "i" } },
        { supplier: { $regex: safeSearch, $options: "i" } }
      ];
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) filter.price.$gte = Number(minPrice);
      if (maxPrice !== undefined) filter.price.$lte = Number(maxPrice);
      if (Object.values(filter.price).some(Number.isNaN)) {
        return res.status(400).json({ success: false, message: "Price filters must be numbers" });
      }
    }

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const allowedSortFields = ["name", "price", "quantity", "category", "createdAt", "updatedAt"];
    const sortField = allowedSortFields.includes(sort) ? sort : "createdAt";
    const sortOrder = order.toLowerCase() === "asc" ? 1 : -1;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ [sortField]: sortOrder })
        .skip((pageNumber - 1) * pageSize)
        .limit(pageSize),
      Product.countDocuments(filter)
    ]);

    res.json({
      success: true,
      total,
      page: pageNumber,
      limit: pageSize,
      totalPages: Math.ceil(total / pageSize),
      products
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/products/:id - Get one product
router.get("/:id", async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    res.json({ success: true, product });
  } catch (error) {
    next(error);
  }
});

// PUT /api/products/:id - Update product details
router.put("/:id", async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id, req.body,
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    res.json({ success: true, product });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/products/:id/stock - Increase/decrease stock safely
// Body: { "change": 10 } to restock, { "change": -2 } to record a sale
router.patch("/:id/stock", async (req, res, next) => {
  try {
    const change = Number(req.body.change);
    if (!Number.isInteger(change) || change === 0) {
      return res.status(400).json({ success: false, message: "change must be a non-zero integer" });
    }

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, quantity: { $gte: Math.max(0, -change) } },
      { $inc: { quantity: change } },
      { new: true, runValidators: true }
    );

    if (!product) {
      const exists = await Product.exists({ _id: req.params.id });
      if (!exists) return res.status(404).json({ success: false, message: "Product not found" });
      return res.status(400).json({ success: false, message: "Insufficient stock for this sale" });
    }

    res.json({ success: true, message: "Stock updated", product });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/products/:id - Delete a product
router.delete("/:id", async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    res.json({ success: true, message: "Product deleted", id: product._id });
  } catch (error) {
    next(error);
  }
});

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = router;