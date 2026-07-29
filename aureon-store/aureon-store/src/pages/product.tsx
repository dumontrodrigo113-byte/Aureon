import { Link, useLocation } from 'wouter';
import { ArrowLeft, Check, ShoppingCart, Zap } from 'lucide-react';
import { useListProducts } from '@workspace/api-client-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/lib/cart';
import { useToast } from '@/hooks/use-toast';
import { formatBRL } from '@/lib/currency';

function ProductPrice({ price, compareAtPrice }: { price: number; compareAtPrice?: number | null }) {
  const onSale = compareAtPrice != null && compareAtPrice > price;
  const discount = onSale ? Math.round((1 - price / compareAtPrice) * 100) : 0;
  return <div className="flex items-center gap-3">{onSale && <span className="text-xl text-muted-foreground line-through">{formatBRL(compareAtPrice)}</span>}<span className={`text-3xl font-bold ${onSale ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>{formatBRL(price)}</span>{onSale && <Badge className="bg-emerald-600">-{discount}% OFF</Badge>}</div>;
}

export default function ProductPage({ params }: { params: { id: string } }) {
  const { data: products, isLoading } = useListProducts();
  const [, setLocation] = useLocation();
  const { addItem } = useCart();
  const { toast } = useToast();
  const product = products?.find((item) => item.id === Number(params.id));

  const addToCart = () => {
    if (!product) return;
    addItem(product);
    toast({ title: 'Adicionado ao carrinho', description: `${product.name} está no seu carrinho.` });
  };

  const buyNow = () => {
    if (!product) return;
    addItem(product);
    setLocation('/checkout');
  };

  if (isLoading) return <div className="min-h-screen bg-background"><Navbar /><div className="container mx-auto px-4 py-32 text-center">Carregando produto...</div></div>;
  if (!product) return <div className="min-h-screen bg-background"><Navbar /><div className="container mx-auto px-4 py-32 text-center"><h1 className="text-2xl font-bold">Produto não encontrado</h1><Link href="/"><Button className="mt-6">Voltar à loja</Button></Link></div></div>;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="container mx-auto flex-1 px-4 py-10 md:px-6 md:py-16">
        <Link href="/" className="mb-10 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Voltar à loja</Link>
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="relative overflow-hidden rounded-3xl border bg-muted/30">
            <img src={product.imageUrl} alt={product.name} className="aspect-square w-full object-cover mix-blend-multiply dark:mix-blend-normal" />
            {product.featured && <Badge className="absolute left-5 top-5">Destaque</Badge>}
          </div>
          <div className="max-w-xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary">{product.category}</p>
            <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">{product.name}</h1>
            <div className="mt-6"><ProductPrice price={product.price} compareAtPrice={product.compareAtPrice} /></div>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">{product.description}</p>
            <div className="mt-8 space-y-3 border-y py-6 text-sm text-muted-foreground">
              <p className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Produto selecionado pela Aureon</p>
              <p className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Compra segura e suporte especializado</p>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <Button size="lg" variant="outline" onClick={addToCart}><ShoppingCart className="mr-2 h-5 w-5" /> Adicionar ao carrinho</Button>
              <Button size="lg" onClick={buyNow}><Zap className="mr-2 h-5 w-5" /> Comprar agora</Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}