import { useRef, useState } from 'react';
import { Link } from 'wouter';
import {
  ArrowLeft, ArrowRight, CheckCircle2, Copy,
  Loader2, LockKeyhole, QrCode, ShoppingBag, User, MapPin,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCart } from '@/lib/cart';
import { formatBRL } from '@/lib/currency';
import { useCreateOrder } from '@workspace/api-client-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CustomerData {
  name: string;
  email: string;
  phone: string;
  cep: string;
  city: string;
  address: string;
  state: string;
  note: string;
}

type Step = 'data' | 'payment' | 'done';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const [step, setStep] = useState<Step>('data');
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);
  const [orderNumber] = useState(() => `AUR-${Date.now().toString().slice(-6)}`);

  if (!items.length && step !== 'done') {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <main className="container mx-auto flex-1 px-4 py-24 text-center">
          <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
          <h1 className="mt-5 text-2xl font-bold">Seu carrinho está vazio</h1>
          <Link href="/"><Button className="mt-6">Explorar produtos</Button></Link>
        </main>
        <Footer />
      </div>
    );
  }

  if (step === 'done') {
    return <DoneStep orderNumber={orderNumber} />;
  }

  if (step === 'payment' && customerData) {
    return (
      <PaymentStep
        customerData={customerData}
        orderNumber={orderNumber}
        items={items}
        subtotal={subtotal}
        onBack={() => setStep('data')}
        onPaid={() => { clearCart(); setStep('done'); }}
      />
    );
  }

  return (
    <DataStep
      initialData={customerData}
      items={items}
      subtotal={subtotal}
      onNext={(data) => { setCustomerData(data); setStep('payment'); }}
    />
  );
}

// ─── Step indicator ────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: 'data' | 'payment' }) {
  const steps = [
    { id: 'data', label: 'Seus dados', icon: User },
    { id: 'payment', label: 'Pagamento', icon: QrCode },
  ] as const;

  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((s, i) => {
        const done = current === 'payment' && s.id === 'data';
        const active = current === s.id;
        const Icon = s.icon;
        return (
          <div key={s.id} className="flex items-center gap-2">
            {i > 0 && <div className={`h-px w-10 ${done || active ? 'bg-primary' : 'bg-border'}`} />}
            <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              active ? 'bg-primary text-primary-foreground' :
              done ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' :
              'bg-muted text-muted-foreground'
            }`}>
              <Icon className="h-3.5 w-3.5" />
              {s.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Order summary sidebar ─────────────────────────────────────────────────────

function OrderSummary({ items, subtotal }: { items: ReturnType<typeof useCart>['items']; subtotal: number }) {
  return (
    <aside className="h-fit rounded-2xl border bg-card p-6">
      <h2 className="text-xl font-bold">Resumo do pedido</h2>
      <div className="mt-5 space-y-4">
        {items.map((item) => (
          <div key={item.id} className="flex gap-3">
            <img
              src={item.imageUrl} alt=""
              className="h-16 w-16 rounded-lg object-cover mix-blend-multiply dark:mix-blend-normal border"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.name}</p>
              <p className="text-sm text-muted-foreground">Qtd. {item.quantity}</p>
            </div>
            <span className={`text-sm font-semibold shrink-0 ${item.compareAtPrice != null && item.compareAtPrice > item.price ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
              {item.compareAtPrice != null && item.compareAtPrice > item.price && (
                <span className="block text-xs text-muted-foreground line-through text-right">{formatBRL(item.compareAtPrice * item.quantity)}</span>
              )}
              {formatBRL(item.price * item.quantity)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-6 flex justify-between border-t pt-5 text-xl font-bold">
        <span>Total</span>
        <span>{formatBRL(subtotal)}</span>
      </div>
    </aside>
  );
}

// ─── Step 1: Data form ─────────────────────────────────────────────────────────

function DataStep({
  initialData,
  items,
  subtotal,
  onNext,
}: {
  initialData: CustomerData | null;
  items: ReturnType<typeof useCart>['items'];
  subtotal: number;
  onNext: (data: CustomerData) => void;
}) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => (fd.get(k) as string) ?? '';
    onNext({
      name: get('name'),
      email: get('email'),
      phone: get('phone'),
      cep: get('cep'),
      city: get('city'),
      address: get('address'),
      state: get('state'),
      note: get('note'),
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="container mx-auto flex-1 px-4 py-10 md:px-6">
        <Link href="/cart" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" /> Voltar ao carrinho
        </Link>

        <StepIndicator current="data" />

        <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight">Seus dados</h1>
              <p className="mt-2 text-muted-foreground">Preencha seus dados de contato e endereço de entrega.</p>
            </div>

            {/* Contact */}
            <section className="rounded-2xl border bg-card p-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <User className="h-5 w-5 text-primary" /> Dados de contato
              </h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="name">Nome completo</Label>
                  <Input id="name" name="name" required placeholder="Seu nome" defaultValue={initialData?.name} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" name="email" type="email" required placeholder="voce@email.com" defaultValue={initialData?.email} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input id="phone" name="phone" required placeholder="(00) 00000-0000" defaultValue={initialData?.phone} />
                </div>
              </div>
            </section>

            {/* Address */}
            <section className="rounded-2xl border bg-card p-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" /> Endereço de entrega
              </h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input id="cep" name="cep" required placeholder="00000-000" defaultValue={initialData?.cep} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input id="city" name="city" required placeholder="Sua cidade" defaultValue={initialData?.city} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input id="address" name="address" required placeholder="Rua, número e complemento" defaultValue={initialData?.address} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">Estado</Label>
                  <Input id="state" name="state" required placeholder="UF" defaultValue={initialData?.state} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="note">Observações (opcional)</Label>
                  <Input id="note" name="note" placeholder="Ex.: deixar na portaria" defaultValue={initialData?.note} />
                </div>
              </div>
            </section>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LockKeyhole className="h-4 w-4 text-primary" /> Seus dados são usados apenas para processar o pedido.
            </div>

            <Button type="submit" size="lg" className="w-full sm:w-auto">
              Ir para pagamento <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          <OrderSummary items={items} subtotal={subtotal} />
        </div>
      </main>
      <Footer />
    </div>
  );
}

// ─── Step 2: Payment ───────────────────────────────────────────────────────────

function PaymentStep({
  customerData,
  orderNumber,
  items,
  subtotal,
  onBack,
  onPaid,
}: {
  customerData: CustomerData;
  orderNumber: string;
  items: ReturnType<typeof useCart>['items'];
  subtotal: number;
  onBack: () => void;
  onPaid: () => void;
}) {
  const [pixCopied, setPixCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const createOrder = useCreateOrder();

  const copyPixKey = async () => {
    await navigator.clipboard.writeText('149-114-896-93');
    setPixCopied(true);
    window.setTimeout(() => setPixCopied(false), 2000);
  };

  const handleConfirm = async () => {
    setConfirmed(true);
    try {
      await createOrder.mutateAsync({
        data: {
          orderNumber,
          customerName: customerData.name,
          email: customerData.email,
          phone: customerData.phone,
          cep: customerData.cep,
          city: customerData.city,
          address: customerData.address,
          state: customerData.state,
          note: customerData.note,
          total: subtotal,
          items: items.map((item) => ({
            productName: item.name,
            imageUrl: item.imageUrl,
            price: item.price,
            compareAtPrice: item.compareAtPrice ?? null,
            quantity: item.quantity,
          })),
        },
      });
      onPaid();
    } catch {
      setConfirmed(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="container mx-auto flex-1 px-4 py-10 md:px-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar aos dados
        </button>

        <StepIndicator current="payment" />

        <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight">Pagamento via Pix</h1>
              <p className="mt-2 text-muted-foreground">
                Realize o Pix no valor de <strong>{formatBRL(subtotal)}</strong> para a chave abaixo, depois confirme aqui.
              </p>
            </div>

            {/* Pix key card */}
            <section className="rounded-2xl border bg-card p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <QrCode className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Chave Pix — CPF</p>
                  <p className="text-sm text-muted-foreground">Aureon Tecnologia</p>
                </div>
              </div>

              <div className="rounded-xl bg-muted/60 p-4">
                <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">Chave</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-lg border bg-background px-3 py-2.5 text-sm font-mono select-all">
                    149-114-896-93
                  </code>
                  <Button type="button" variant="outline" size="sm" onClick={copyPixKey}>
                    <Copy className="mr-2 h-4 w-4" />
                    {pixCopied ? 'Copiada!' : 'Copiar'}
                  </Button>
                </div>
              </div>

              <div className="rounded-xl bg-muted/60 p-4 flex justify-between items-center">
                <p className="text-sm text-muted-foreground">Valor a transferir</p>
                <p className="text-2xl font-extrabold">{formatBRL(subtotal)}</p>
              </div>

              <ol className="space-y-2 text-sm text-muted-foreground list-none">
                {[
                  'Abra o app do seu banco e acesse o Pix.',
                  'Escolha pagar com chave e cole: 149-114-896-93.',
                  `Informe o valor exato de ${formatBRL(subtotal)}.`,
                  'Confirme o pagamento.',
                  'Volte aqui e clique no botão abaixo.',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary mt-0.5">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </section>

            {/* Delivery summary */}
            <section className="rounded-2xl border bg-card p-6 text-sm space-y-1">
              <p className="font-semibold mb-2">Entrega para</p>
              <p className="text-muted-foreground">{customerData.name}</p>
              <p className="text-muted-foreground">{customerData.address}, {customerData.city} — {customerData.state}</p>
              <p className="text-muted-foreground">CEP {customerData.cep}</p>
              {customerData.note && <p className="text-muted-foreground italic">"{customerData.note}"</p>}
            </section>

            {createOrder.isError && (
              <p className="text-sm text-destructive rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
                Erro ao registrar o pedido. Verifique sua conexão e tente novamente.
              </p>
            )}

            <Button
              size="lg"
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleConfirm}
              disabled={confirmed || createOrder.isPending}
            >
              {createOrder.isPending
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registrando pedido...</>
                : <><CheckCircle2 className="mr-2 h-5 w-5" /> Já realizei o pagamento</>
              }
            </Button>

            <p className="text-xs text-muted-foreground">
              Ao confirmar, seu pedido será registrado e entraremos em contato após verificarmos o Pix.
            </p>
          </div>

          <OrderSummary items={items} subtotal={subtotal} />
        </div>
      </main>
      <Footer />
    </div>
  );
}

// ─── Step 3: Done ─────────────────────────────────────────────────────────────

function DoneStep({ orderNumber }: { orderNumber: string }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="container mx-auto flex-1 px-4 py-24 text-center flex flex-col items-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
          <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="mt-6 text-4xl font-extrabold">Pedido registrado!</h1>
        <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
          Seu pedido <strong>{orderNumber}</strong> foi confirmado. Assim que identificarmos o Pix, iniciaremos a separação e entraremos em contato.
        </p>
        <div className="mt-8 rounded-xl border bg-card px-6 py-4 text-sm text-muted-foreground max-w-sm text-left space-y-1">
          <p className="font-semibold text-foreground mb-2">Próximos passos</p>
          <p>✓ Pagamento via Pix enviado</p>
          <p>⏳ Aguardando confirmação (até 30 min)</p>
          <p>📦 Separação e envio do pedido</p>
        </div>
        <Link href="/"><Button className="mt-8">Voltar à loja</Button></Link>
      </main>
      <Footer />
    </div>
  );
}
