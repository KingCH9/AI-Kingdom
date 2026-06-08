"use client";

import { useEffect, useState } from "react";

interface Product {
  id: number;
  name: string;
  price: number;
  storeId: number;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);

  const loadProducts = async () => {
    const res = await fetch("/api/products");
    const data = await res.json();
    setProducts(data);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  return (
    <div className="p-10 max-w-3xl text-white">
      <h1 className="text-4xl font-bold mb-4">Products</h1>
      <p className="text-gray-400 mb-8 text-sm">
        Products are created automatically when Gamma completes a marketing-plan
        task for a launched store. Manual product creation has been deprecated.
      </p>

      {products.length === 0 ? (
        <p className="text-gray-500 text-sm">No products yet.</p>
      ) : (
        <ul className="space-y-3">
          {products.map((product) => (
            <li
              key={product.id}
              className="border border-gray-800 rounded-lg p-4 bg-gray-950"
            >
              <p className="font-medium">{product.name}</p>
              <p className="text-gray-300">Price: £{product.price.toFixed(2)}</p>
              <p className="text-gray-400 text-sm">Store ID: {product.storeId}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
