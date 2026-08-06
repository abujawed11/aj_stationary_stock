-- CreateTable
CREATE TABLE `supplier_quotations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `productId` INTEGER NOT NULL,
    `supplierId` INTEGER NOT NULL,
    `unitPrice` DECIMAL(12, 2) NOT NULL,
    `moq` INTEGER NOT NULL DEFAULT 1,
    `deliveryCharge` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `discount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `schemeBuyQty` INTEGER NULL,
    `schemeFreeQty` INTEGER NULL,
    `otherCharges` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `deliveryTime` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdById` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `supplier_quotations_productId_idx`(`productId`),
    INDEX `supplier_quotations_supplierId_idx`(`supplierId`),
    INDEX `supplier_quotations_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `supplier_quotations` ADD CONSTRAINT `supplier_quotations_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_quotations` ADD CONSTRAINT `supplier_quotations_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_quotations` ADD CONSTRAINT `supplier_quotations_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
