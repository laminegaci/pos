import ProductCard from './ProductCard';

export default function ProductGrid({ products, viewMode, onAdd }) {
    if (products.length === 0) {
        return (
            <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
                Aucun produit trouvé.
            </div>
        );
    }

    const className =
        viewMode === 'grid'
            ? 'grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-3 sm:gap-4' // columns follow the width left by the cart
            : 'flex flex-col gap-2';

    return (
        <div className={className}>
            {products.map((product) => (
                <ProductCard key={product.id} product={product} viewMode={viewMode} onAdd={onAdd} />
            ))}
        </div>
    );
}
