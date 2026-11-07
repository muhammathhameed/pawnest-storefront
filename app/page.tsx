import { supabase } from "../lib/supabase";
import CartButton from "../components/CartButton";
import AddToCartButton from "../components/AddToCartButton";

export default async function Home() {
  const { data: products, error } = await supabase
    .from("products")
    .select("*");

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <main style={{ padding: "2rem" }}>
      <header className="flex justify-between items-center mb-8">
  <h1 className="text-4xl font-bold">🐾 PawNest Store</h1>

 <CartButton />
</header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
          gap: "20px",
          marginTop: "20px",
        }}
      >
        {products?.map((product) => (
         <div
  key={product.id}
  className="border rounded-xl p-4 shadow-sm hover:shadow-lg transition"
>
  {
            product.image_url && (
  <img
    src={product.image_url}
    alt={product.name}
    style={{
      width: "100%",
      height: "200px",
      objectFit: "cover",
      borderRadius: "8px",
      marginBottom: "10px",
    }}
  />
)}
            <h3>{product.name}</h3>

            <p>{product.description}</p>

            <p>
              <strong>Category:</strong> {product.category}
            </p>

            <p>
              <strong>Price:</strong> ${product.price}
            </p>

           <AddToCartButton product={product} />
          </div>
        ))}
      </div>
    </main>
  );
}