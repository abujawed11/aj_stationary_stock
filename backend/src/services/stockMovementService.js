const ApiError = require("../utils/ApiError");

async function increaseStock(tx, productId, quantity) {
  const product = await tx.product.findUnique({ where: { id: productId } });
  if (!product) {
    throw new ApiError(404, "Product not found");
  }
  const stockBefore = product.currentStock;
  const stockAfter = stockBefore + quantity;
  await tx.product.update({ where: { id: productId }, data: { currentStock: stockAfter } });
  return { stockBefore, stockAfter };
}

async function decreaseStock(tx, productId, quantity) {
  const result = await tx.product.updateMany({
    where: { id: productId, currentStock: { gte: quantity } },
    data: { currentStock: { decrement: quantity } },
  });

  if (result.count === 0) {
    const product = await tx.product.findUnique({ where: { id: productId } });
    throw new ApiError(400, `Insufficient stock for ${product ? product.name : "product"}`);
  }

  const updated = await tx.product.findUnique({ where: { id: productId } });
  return { stockBefore: updated.currentStock + quantity, stockAfter: updated.currentStock };
}

async function recordMovement(tx, { productId, movementType, referenceType, referenceId, quantityIn = 0, quantityOut = 0, stockBefore, stockAfter, note, createdById }) {
  return tx.stockMovement.create({
    data: {
      productId,
      movementType,
      referenceType,
      referenceId,
      quantityIn,
      quantityOut,
      stockBefore,
      stockAfter,
      note,
      createdById,
    },
  });
}

module.exports = { increaseStock, decreaseStock, recordMovement };
