import { Link } from 'wouter';
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { useCart } from '@/lib/cart';
import { formatBRL } from '@/lib/currency';

function CartPrice({ price, compareAtPrice, quantity = 1 }: { price: number; compareAtPrice?: number | null; quantity?: number }) {
  const onSale = compareAtPrice != null && compareAtPrice > price;
  return <div className="text-right">{onSale && <span className="block text-xs text-muted-foreground line-through">{formatBRL(compareAtPrice * quantity)}</span>}<span className={`font-bold ${onSale ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>{formatBRL(price * quantity)}</span></div>;
}

export default function CartPage() {
  const { items, subtotal, updateQuantity, removeItem } = useCart();
  return <div className="flex min-h-screen flex-col bg-background"><Navbar /><main className="container mx-auto flex-1 px-4 py-12 md:px-6">
    <h1 className="text-4xl font-extrabold tracking-tight">Seu carrinho</h1>
    <p className="mt-2 text-muted-foreground">{items.length ? `${items.length} produto(s) selecionado(s)` : 'Seu carrinho está vazio.'}</p>
    {!items.length ? <div className="mt-16 flex flex-col items-center rounded-2xl border border-dashed py-20 text-center"><ShoppingBag className="mb-4 h-12 w-12 text-muted-foreground" /><h2 className="text-xl font-semibold">Nada por aqui ainda</h2><Link href="/"><Button className="mt-6">Explorar produtos</Button></Link></div> :
      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">{items.map((item) => <div key={item.id} className="flex gap-4 rounded-2xl border bg-card p-4">
          <Link href={`/product/${item.id}`}><img src={item.imageUrl} alt={item.name} className="h-28 w-28 rounded-xl object-cover mix-blend-multiply dark:mix-blend-normal" /></Link>
          <div className="min-w-0 flex-1"><Link href={`/product/${item.id}`} className="font-semibold hover:text-primary">{item.name}</Link><p className="mt-1 text-sm text-muted-foreground">{item.compareAtPrice != null && item.compareAtPrice > item.price && <span className="mr-2 line-through">{formatBRL(item.compareAtPrice)}</span>}<span className={item.compareAtPrice != null && item.compareAtPrice > item.price ? 'text-emerald-600 dark:text-emerald-400' : ''}>{formatBRL(item.price)} cada</span></p>
            <div className="mt-4 flex items-center gap-3"><div className="flex items-center rounded-lg border"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity - 1)}><Minus className="h-3 w-3" /></Button><span className="w-8 text-center text-sm">{item.quantity}</span><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity + 1)}><Plus className="h-3 w-3" /></Button></div><button className="text-muted-foreground hover:text-destructive" onClick={() => removeItem(item.id)} aria-label={`Remover ${item.name}`}><Trash2 className="h-4 w-4" /></button></div>
          </div><CartPrice price={item.price} compareAtPrice={item.compareAtPrice} quantity={item.quantity} />
        </div>)}</div>
         <div className="h-fit rounded-2xl border bg-card p-6"><h2 className="text-xl font-bold">Resumo</h2><div className="mt-6 flex justify-between border-b pb-4 text-muted-foreground"><span>Subtotal</span><span>{formatBRL(subtotal)}</span></div><div className="mt-4 flex justify-between text-xl font-bold"><span>Total</span><span>{formatBRL(subtotal)}</span></div><Link href="/checkout"><Button size="lg" className="mt-6 w-full">Ir para checkout</Button></Link><Link href="/" className="mt-4 block text-center text-sm text-muted-foreground hover:text-foreground">Continuar comprando</Link></div>
      </div>}
  </main><Footer /></div>;
}