"use client";

import AddToCartButton from "./AddToCartButton";

type Props = {
  slug: string;
  title: string;
  priceKzt: number;
  imageUrl?: string;
  sku?: string;
};

export default function ListItemCartButton(props: Props) {
  return <AddToCartButton {...props} size="sm" />;
}
