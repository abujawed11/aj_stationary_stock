const { Prisma } = require("../../generated/prisma");

const { Decimal } = Prisma;

function toDecimal(value) {
  return new Decimal(value ?? 0);
}

function multiply(a, b) {
  return toDecimal(a).mul(toDecimal(b));
}

function add(...values) {
  return values.reduce((sum, v) => sum.add(toDecimal(v)), new Decimal(0));
}

function subtract(a, b) {
  return toDecimal(a).sub(toDecimal(b));
}

function toNumber(decimal) {
  return Number(toDecimal(decimal).toFixed(2));
}

module.exports = { Decimal, toDecimal, multiply, add, subtract, toNumber };
