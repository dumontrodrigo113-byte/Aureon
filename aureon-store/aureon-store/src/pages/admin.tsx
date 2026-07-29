import { useState, useEffect } from 'react';
import { Show, useAuth, useUser } from '@clerk/react';
import { Redirect } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import {
  useListProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  getListProductsQueryKey,
  useListOrders,
  useUpdateOrderStatus,
  getListOrdersQueryKey,
} from '@workspace/api-client-react';
import type { OrderWithItems } from '@workspace/api-client-react';
import { OrderStatusUpdateStatus } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus, Pencil, Trash2, Search, Package, Star,
  ShoppingBag, User, MapPin, ChevronDown, ChevronUp, RefreshCw,
} from 'lucide-react';
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { formatBRL } from '@/lib/currency';

// ─── Product form schema ────────────────────────────────────────────────────

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  price: z.coerce.number().min(0, "Price must be non-negative"),
  compareAtPrice: z.union([z.coerce.number().min(0), z.literal("")])
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  imageUrl: z.string().url("Must be a valid URL"),
  description: z.string().min(1, "Description is required"),
  featured: z.boolean().default(false),
}).refine(
  (d) => d.compareAtPrice == null || d.compareAtPrice > d.price,
  { message: "Original price must be greater than sale price", path: ["compareAtPrice"] },
);

type ProductFormValues = z.infer<typeof productSchema>;

// ─── Status helpers ─────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  pending: 'Aguardando Pix',
  confirmed: 'Confirmado',
  shipped: 'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  shipped: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
  delivered: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

// ─── Root ────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { isSignedIn } = useAuth();
  const { user, isLoaded } = useUser();

  if (
    isSignedIn === false ||
    (isLoaded && user?.primaryEmailAddress?.emailAddress?.toLowerCase() !== 'rodrigodumont11@gmail.com')
  ) {
    return <Redirect to="/sign-in" />;
  }

  if (!isLoaded) return null;

  return (
    <Show when="signed-in">
      <AdminDashboard />
    </Show>
  );
}

// ─── Dashboard shell ─────────────────────────────────────────────────────────

type Tab = 'catalog' | 'orders';

function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('orders');

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Painel Administrativo</h1>
          <p className="text-muted-foreground mt-1">Gerencie pedidos e o catálogo da Aureon.</p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 rounded-xl bg-muted p-1 w-fit mb-8">
          <button
            onClick={() => setTab('orders')}
            className={`flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
              tab === 'orders'
                ? 'bg-background shadow text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ShoppingBag className="h-4 w-4" /> Pedidos
          </button>
          <button
            onClick={() => setTab('catalog')}
            className={`flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
              tab === 'catalog'
                ? 'bg-background shadow text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Package className="h-4 w-4" /> Catálogo
          </button>
        </div>

        {tab === 'orders' ? <OrdersPanel /> : <CatalogPanel />}
      </main>
      <Footer />
    </div>
  );
}

// ─── Orders panel ────────────────────────────────────────────────────────────

function OrdersPanel() {
  const { data: orders, isLoading, isError, refetch, isFetching } = useListOrders();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const updateStatus = useUpdateOrderStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
        toast({ title: 'Status atualizado.' });
      },
      onError: () => toast({ title: 'Erro ao atualizar status.', variant: 'destructive' }),
    },
  });

  const filtered = orders?.filter((o) =>
    o.customerName.toLowerCase().includes(search.toLowerCase()) ||
    o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
    o.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, pedido ou e-mail..."
            className="pl-9 bg-background"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Stats row */}
      {orders && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {(['pending', 'confirmed', 'shipped', 'delivered'] as const).map((s) => (
            <div key={s} className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">{STATUS_LABELS[s]}</p>
              <p className="text-2xl font-bold mt-1">{orders.filter((o) => o.status === s).length}</p>
            </div>
          ))}
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : isError ? (
        <div className="rounded-xl border bg-muted/20 py-16 text-center text-destructive">
          Erro ao carregar pedidos.
        </div>
      ) : !filtered?.length ? (
        <div className="rounded-xl border border-dashed py-20 text-center flex flex-col items-center">
          <ShoppingBag className="h-10 w-10 text-muted-foreground mb-4 opacity-40" />
          <h3 className="text-lg font-medium">Nenhum pedido encontrado</h3>
          <p className="text-muted-foreground mt-1 text-sm">Os pedidos aparecerão aqui quando os clientes finalizarem o checkout.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              expanded={expanded === order.id}
              onToggle={() => setExpanded(expanded === order.id ? null : order.id)}
              onStatusChange={(status) => updateStatus.mutate({ id: order.id, data: { status: status as OrderStatusUpdateStatus } })}
              isPending={updateStatus.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({
  order,
  expanded,
  onToggle,
  onStatusChange,
  isPending,
}: {
  order: OrderWithItems;
  expanded: boolean;
  onToggle: () => void;
  onStatusChange: (status: string) => void;
  isPending: boolean;
}) {
  const date = new Date(order.createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <button
        className="w-full text-left px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-muted/30 transition-colors"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-semibold text-muted-foreground">{order.orderNumber}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[order.status] ?? STATUS_COLORS.pending}`}>
              {STATUS_LABELS[order.status] ?? order.status}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-sm font-medium">
            <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            {order.customerName}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
            <MapPin className="h-3 w-3 shrink-0" />
            {order.address}, {order.city} — {order.state} &nbsp;·&nbsp; CEP {order.cep}
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <p className="font-bold text-base">{formatBRL(Number(order.total))}</p>
            <p className="text-xs text-muted-foreground">{date}</p>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t px-5 py-4 bg-muted/20 space-y-5">
          {/* Contact */}
          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">E-mail</p>
              <p className="font-medium">{order.email}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Telefone</p>
              <p className="font-medium">{order.phone}</p>
            </div>
            {order.note && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Observação</p>
                <p className="font-medium">{order.note}</p>
              </div>
            )}
          </div>

          {/* Items */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Itens do pedido</p>
            <div className="space-y-2">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-lg border bg-background p-3">
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt="" className="h-12 w-12 rounded-md object-cover mix-blend-multiply dark:mix-blend-normal border shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">Qtd. {item.quantity}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {item.compareAtPrice != null && Number(item.compareAtPrice) > Number(item.price) && (
                      <p className="text-xs text-muted-foreground line-through">{formatBRL(Number(item.compareAtPrice) * item.quantity)}</p>
                    )}
                    <p className={`text-sm font-semibold ${item.compareAtPrice != null && Number(item.compareAtPrice) > Number(item.price) ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                      {formatBRL(Number(item.price) * item.quantity)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Status update */}
          <div className="flex items-center gap-3">
            <p className="text-sm font-medium shrink-0">Atualizar status:</p>
            <Select
              value={order.status}
              onValueChange={onStatusChange}
              disabled={isPending}
            >
              <SelectTrigger className="w-52 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Catalog panel ────────────────────────────────────────────────────────────

function CatalogPanel() {
  const { data: products, isLoading, isError } = useListProducts();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const createProduct = useCreateProduct({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        setIsCreateOpen(false);
        toast({ title: "Produto criado com sucesso." });
      },
      onError: () => toast({ title: "Erro ao criar produto.", variant: "destructive" }),
    },
  });

  const updateProduct = useUpdateProduct({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        setEditProduct(null);
        toast({ title: "Produto atualizado com sucesso." });
      },
      onError: () => toast({ title: "Erro ao atualizar produto.", variant: "destructive" }),
    },
  });

  const deleteProduct = useDeleteProduct({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        setDeleteId(null);
        toast({ title: "Produto excluído." });
      },
      onError: () => toast({ title: "Erro ao excluir produto.", variant: "destructive" }),
    },
  });

  const filtered = products?.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <p className="text-muted-foreground text-sm">Adicione, edite ou remova produtos da loja.</p>
        <Button onClick={() => setIsCreateOpen(true)} className="md:w-auto w-full group">
          <Plus className="mr-2 h-4 w-4 transition-transform group-hover:rotate-90" /> Adicionar produto
        </Button>
      </div>

      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-muted/20 flex items-center">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produtos..."
              className="pl-9 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/40 border-b">
              <tr>
                <th className="px-6 py-4 font-medium">Produto</th>
                <th className="px-6 py-4 font-medium hidden md:table-cell">Categoria</th>
                <th className="px-6 py-4 font-medium">Preço</th>
                <th className="px-6 py-4 font-medium hidden sm:table-cell">Status</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-6 py-4"><Skeleton className="h-10 w-48" /></td>
                    <td className="px-6 py-4 hidden md:table-cell"><Skeleton className="h-6 w-24" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-16" /></td>
                    <td className="px-6 py-4 hidden sm:table-cell"><Skeleton className="h-6 w-16" /></td>
                    <td className="px-6 py-4 text-right"><Skeleton className="h-8 w-20 ml-auto" /></td>
                  </tr>
                ))
              ) : isError ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-destructive">Erro ao carregar catálogo.</td>
                </tr>
              ) : filtered?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Package className="h-10 w-10 text-muted-foreground mb-4 opacity-40" />
                      <h3 className="text-lg font-medium">Nenhum produto encontrado</h3>
                      <p className="text-muted-foreground mt-1">Ajuste a busca ou adicione um novo produto.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered?.map((product) => (
                  <tr key={product.id} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded bg-zinc-100 dark:bg-zinc-900 border overflow-hidden flex-shrink-0">
                          <img src={product.imageUrl} alt="" className="h-full w-full object-cover mix-blend-multiply dark:mix-blend-normal" />
                        </div>
                        <div className="font-medium text-foreground line-clamp-2">{product.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {product.compareAtPrice != null && product.compareAtPrice > product.price ? (
                        <div>
                          <span className="block text-xs text-muted-foreground line-through">{formatBRL(product.compareAtPrice)}</span>
                          <span className="text-emerald-600 dark:text-emerald-400">{formatBRL(product.price)}</span>
                        </div>
                      ) : formatBRL(product.price)}
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      {product.featured ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                          <Star className="h-3 w-3 fill-current" /> Destaque
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">Padrão</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditProduct(product)}>
                          <Pencil className="h-4 w-4 md:mr-2" />
                          <span className="hidden md:inline">Editar</span>
                        </Button>
                        <Button
                          variant="outline" size="sm"
                          className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => setDeleteId(product.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialogs */}
      <ProductFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={(data) => createProduct.mutate({ data })}
        isSubmitting={createProduct.isPending}
        title="Adicionar produto"
      />
      <ProductFormDialog
        open={!!editProduct}
        onOpenChange={(open) => !open && setEditProduct(null)}
        initialData={editProduct}
        onSubmit={(data) => { if (editProduct) updateProduct.mutate({ id: editProduct.id, data }); }}
        isSubmitting={updateProduct.isPending}
        title="Editar produto"
      />
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. O produto será removido permanentemente do catálogo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteProduct.mutate({ id: deleteId })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteProduct.isPending}
            >
              {deleteProduct.isPending ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Product form dialog ─────────────────────────────────────────────────────

function ProductFormDialog({
  open, onOpenChange, initialData, onSubmit, isSubmitting, title,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: any;
  onSubmit: (data: ProductFormValues) => void;
  isSubmitting: boolean;
  title: string;
}) {
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: initialData || {
      name: '', category: '', price: 0, compareAtPrice: null, imageUrl: '', description: '', featured: false,
    },
  });

  useEffect(() => {
    if (open) {
      reset(initialData || {
        name: '', category: '', price: 0, compareAtPrice: null, imageUrl: '', description: '', featured: false,
      });
    }
  }, [open, initialData, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Preencha os detalhes abaixo e clique em salvar.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nome do produto</Label>
            <Input id="name" {...register("name")} placeholder="Ex.: Teclado Ergonômico" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="category">Categoria</Label>
              <Input id="category" {...register("category")} placeholder="Ex.: Acessórios" />
              {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="price">Preço atual (BRL)</Label>
              <Input id="price" type="number" step="0.01" {...register("price")} placeholder="0.00" />
              {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="compareAtPrice">Preço antes da promoção (BRL)</Label>
              <Input id="compareAtPrice" type="number" step="0.01" {...register("compareAtPrice")} placeholder="Opcional" />
              {errors.compareAtPrice && <p className="text-xs text-destructive">{errors.compareAtPrice.message}</p>}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="imageUrl">URL da imagem</Label>
            <Input id="imageUrl" {...register("imageUrl")} placeholder="https://exemplo.com/imagem.jpg" />
            {errors.imageUrl && <p className="text-xs text-destructive">{errors.imageUrl.message}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" {...register("description")} placeholder="Descreva o produto..." rows={3} />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>

          <div className="flex items-center gap-3">
            <Controller
              name="featured"
              control={control}
              render={({ field }) => (
                <Switch id="featured" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
            <Label htmlFor="featured">Produto em destaque</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar produto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
