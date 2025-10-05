export async function fetchInventoryProducts(token: string) {
  const res = await fetch('https://api.interphaselabs.com/api/v1/inventory/products', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
}

export async function fetchInventorySuppliers(token: string) {
  const res = await fetch('https://api.interphaselabs.com/api/v1/inventory/suppliers', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch suppliers');
  return res.json();
}

export async function fetchInventoryWarehouses(token: string) {
  const res = await fetch('https://api.interphaselabs.com/api/v1/inventory/warehouses', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch warehouses');
  return res.json();
}

export async function fetchProductTypes(token: string) {
  const res = await fetch('https://api.interphaselabs.com/api/v1/inventory/product-types', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch product types');
  return res.json();
}