import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useListProducts } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, ShoppingCart, Star } from 'lucide-react';
import { Link } from 'wouter';
import { useCart } from '@/lib/cart';
import { formatBRL } from '@/lib/currency';

function PriceDisplay({ price, compareAtPrice, large = false }: { price: number; compareAtPrice?: number | null; large?: boolean }) {
  const onSale = compareAtPrice != null && compareAtPrice > price;
  const discount = onSale ? Math.round((1 - price / compareAtPrice) * 100) : 0;
  return (
    <div className="flex items-baseline gap-2">
      {onSale && <span className="text-sm text-muted-foreground line-through">{formatBRL(compareAtPrice)}</span>}
      <span className={`${large ? 'text-2xl' : 'text-lg'} font-bold ${onSale ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>{formatBRL(price)}</span>
      {onSale && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">-{discount}%</span>}
    </div>
  );
}
import { useToast } from '@/hooks/use-toast';

export default function HomePage() {
  const { data: products, isLoading, isError } = useListProducts();
  const { toast } = useToast();
  const { addItem } = useCart();

  const handleAddToCart = (product: NonNullable<typeof products>[number]) => {
    addItem(product);
    toast({
      title: "Adicionado ao carrinho",
      description: `${product.name} foi adicionado ao seu carrinho.`,
    });
  };

  const featuredProducts = products?.filter(p => p.featured) || [];
  const standardProducts = products?.filter(p => !p.featured) || [];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-zinc-950 text-white">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/30 via-black/90 to-black z-10" />
            <img 
              src="/hero-bg.jpg" 
              alt="Tech setup" 
              className="w-full h-full object-cover opacity-40 mix-blend-overlay"
            />
          </div>
          <div className="container mx-auto px-4 md:px-6 relative z-20 py-24 md:py-36 lg:py-48 flex flex-col items-center text-center">
            <Badge className="bg-primary/20 text-primary-foreground border-primary/50 mb-6 py-1 px-3">
              New Arrivals Available
            </Badge>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl text-white drop-shadow-sm mb-6 leading-tight">
              Practical Tech. <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-primary">
                Uncompromising Polish.
              </span>
            </h1>
            <p className="text-lg md:text-xl text-zinc-300 max-w-2xl mb-10">
              Aureon brings you a curated selection of modern electronics and accessories designed to elevate your everyday workflow.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="h-14 px-8 text-base bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => {
                document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
              }}>
                Shop the Catalog <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </section>

        <div id="catalog" className="container mx-auto px-4 md:px-6 py-16 md:py-24 space-y-24">
          
          {/* Featured Section */}
          {(!isLoading && featuredProducts.length > 0) && (
            <section>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                  <Star className="h-6 w-6 text-primary" /> Featured Excellence
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {featuredProducts.slice(0, 2).map((product) => (
                  <div key={product.id} className="group relative rounded-2xl overflow-hidden bg-card border shadow-sm transition-all hover:shadow-xl hover-elevate">
                    <Link href={`/product/${product.id}`} className="block aspect-[4/3] w-full bg-zinc-100 dark:bg-zinc-900 overflow-hidden relative">
                      <img 
                        src={product.imageUrl} 
                        alt={product.name} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground">
                        Featured
                      </Badge>
                    </Link>
                    <div className="p-8 flex flex-col justify-between h-full bg-card">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-sm font-medium text-primary mb-1 uppercase tracking-wider">{product.category}</p>
                            <h3 className="text-2xl font-bold">{product.name}</h3>
                          </div>
                          <PriceDisplay price={product.price} compareAtPrice={product.compareAtPrice} large />
                        </div>
                        <p className="text-muted-foreground mt-4 line-clamp-3">{product.description}</p>
                      </div>
                      <Button 
                        size="lg" 
                        className="w-full mt-8"
                        onClick={() => handleAddToCart(product)}
                      >
                        <ShoppingCart className="mr-2 h-5 w-5" /> Add to Cart
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Standard Catalog */}
          {(isLoading || isError || standardProducts.length > 0 || (standardProducts.length === 0 && featuredProducts.length === 0)) && (
          <section>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold tracking-tight">The Collection</h2>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="flex flex-col gap-3">
                    <Skeleton className="aspect-square w-full rounded-xl" />
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-10 w-full mt-2" />
                  </div>
                ))}
              </div>
            ) : isError ? (
              <div className="py-24 text-center rounded-2xl border bg-muted/20">
                <p className="text-destructive mb-2">Failed to load products.</p>
                <p className="text-muted-foreground">Please try again later.</p>
              </div>
            ) : standardProducts.length === 0 && featuredProducts.length === 0 ? (
              <div className="py-24 text-center rounded-2xl border bg-muted/20 flex flex-col items-center">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-xl font-semibold mb-2">Coming Soon</h3>
                <p className="text-muted-foreground max-w-sm">We are preparing our collection. Check back soon for premium technology accessories.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {standardProducts.map((product) => (
                  <div key={product.id} className="group flex flex-col rounded-xl overflow-hidden border bg-card hover:shadow-md transition-all">
                    <Link href={`/product/${product.id}`} className="block aspect-square bg-zinc-100 dark:bg-zinc-900 overflow-hidden relative">
                      <img 
                        src={product.imageUrl} 
                        alt={product.name} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 mix-blend-multiply dark:mix-blend-normal"
                      />
                    </Link>
                    <div className="p-5 flex flex-col flex-1">
                      <p className="text-xs font-medium text-primary mb-1 uppercase tracking-wider">{product.category}</p>
                      <h3 className="font-semibold text-lg leading-tight mb-2 line-clamp-1">{product.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">{product.description}</p>
                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
                        <PriceDisplay price={product.price} compareAtPrice={product.compareAtPrice} />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-10 w-10 rounded-full hover:bg-primary hover:text-primary-foreground transition-colors"
                           onClick={() => handleAddToCart(product)}
                          aria-label={`Add ${product.name} to cart`}
                        >
                          <ShoppingCart className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
          )}

        </div>
      </main>

      <Footer />
    </div>
  );
}
