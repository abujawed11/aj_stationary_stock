const express = require("express");
const validate = require("../middleware/validate");
const { authenticate } = require("../middleware/authMiddleware");
const { createSalesReturnSchema } = require("../validators/salesReturnValidators");
const salesReturnController = require("../controllers/salesReturnController");

const router = express.Router();

router.use(authenticate);

router.get("/", salesReturnController.list);
router.post("/", validate(createSalesReturnSchema), salesReturnController.create);
router.get("/:id", salesReturnController.getById);

module.exports = router;
