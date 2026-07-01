import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2, Pencil, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useSubscription } from "@/lib/subscription-context";
import { UpgradeModal } from "@/components/upgrade-modal";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImageUpload } from "@/components/image-upload";
import { PageSkeleton } from "@/components/loading-skeleton";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productSchema } from "@/lib/validation";

export const Route = createFileRoute("/dashboard/collection/$id")({
  head: () => ({ meta: [{ title: "Edit collection — creator·kz" }] }),
  component: EditCollection,
});

function EditCollection() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isFree, checkLimit } = useSubscription();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const { data: collection } = useQuery({
    queryKey: ["collection", id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("collections").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["collection-products", id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("collection_id", id)
        .order("position", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [cover, setCover] = useState("");

  const [editingProduct, setEditingProduct] = useState<string | null>(null);

  const addForm = useForm({ resolver: zodResolver(productSchema) });
  const {
    register: addReg,
    handleSubmit: addHandle,
    formState: { errors: addErr, isSubmitting: addSub },
    setValue: addSet,
    watch: addWatch,
    reset: addReset,
  } = addForm;

  const editForm = useForm({ resolver: zodResolver(productSchema) });
  const {
    register: editReg,
    handleSubmit: editHandle,
    formState: { errors: editErr, isSubmitting: editSub },
    setValue: editSet,
    watch: editWatch,
  } = editForm;

  useEffect(() => {
    if (collection) {
      setTitle(collection.title);
      setDesc(collection.description ?? "");
      setCover(collection.cover_url ?? "");
    }
  }, [collection]);

  async function saveCollection() {
    const { error } = await supabase
      .from("collections")
      .update({ title, description: desc, cover_url: cover })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Saved.");
    qc.invalidateQueries({ queryKey: ["collection", id] });
    qc.invalidateQueries({ queryKey: ["my-collections"] });
  }

  async function addProduct(data: {
    name: string;
    image_url?: string;
    external_link?: string;
    description?: string;
    price?: number;
    category?: string;
  }) {
    if (isFree) {
      const limit = await checkLimit("products");
      if (!limit.allowed) {
        setUpgradeOpen(true);
        return;
      }
    }
    const { error } = await supabase.from("products").insert({
      collection_id: id,
      creator_id: user!.id,
      name: data.name,
      image_url: data.image_url || null,
      external_link: data.external_link || null,
      position: products.length,
    });
    if (error) return toast.error(error.message);
    addReset();
    qc.invalidateQueries({ queryKey: ["collection-products", id] });
  }

  async function deleteProduct(pid: string) {
    const { error } = await supabase.from("products").delete().eq("id", pid);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["collection-products", id] });
  }

  function startEditProduct(p: (typeof products)[0]) {
    setEditingProduct(p.id);
    editSet("name", p.name);
    editSet("image_url", p.image_url ?? "");
    editSet("external_link", p.external_link ?? "");
  }

  async function saveEditProduct(data: {
    name: string;
    image_url?: string;
    external_link?: string;
  }) {
    if (!editingProduct) return;
    const { error } = await supabase
      .from("products")
      .update({
        name: data.name,
        image_url: data.image_url || null,
        external_link: data.external_link || null,
      })
      .eq("id", editingProduct);
    if (error) return toast.error(error.message);
    setEditingProduct(null);
    qc.invalidateQueries({ queryKey: ["collection-products", id] });
  }

  if (!collection) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-5xl px-6 py-20">
          <PageSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-6 py-12">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>

        <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_360px]">
          {/* Products */}
          <div className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Editing</p>
              <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
                {collection.title}
              </h1>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6">
              <h2 className="mb-4 font-display text-xl font-semibold">Add a product</h2>
              <form onSubmit={addHandle(addProduct)} className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                  <div className="space-y-0.5">
                    <Input placeholder="Product name" {...addReg("name")} />
                    {addErr.name && (
                      <p className="text-xs text-destructive">{addErr.name.message as string}</p>
                    )}
                  </div>
                  <Input placeholder="Link (Kaspi, etc.)" {...addReg("external_link")} />
                  <Button type="submit" disabled={addSub}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <ImageUpload
                  value={addWatch("image_url")}
                  onChange={(v) => addSet("image_url", v)}
                  folder="products"
                />
              </form>
            </div>

            {products.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
                No products yet.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {products.map((p) => (
                  <div
                    key={p.id}
                    className="group relative overflow-hidden rounded-2xl border border-border bg-card"
                  >
                    <div className="aspect-square overflow-hidden bg-warm">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="grid h-full place-items-center text-xs text-muted-foreground">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 p-3">
                      <p className="text-sm font-medium leading-snug">{p.name}</p>
                      <div className="flex items-center justify-between">
                        {p.external_link ? (
                          <a
                            href={p.external_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:text-accent"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        ) : (
                          <span />
                        )}
                        <div className="flex gap-1">
                          <button
                            onClick={() => startEditProduct(p)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => deleteProduct(p.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Dialog open={!!editingProduct} onOpenChange={(o) => !o && setEditingProduct(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-display text-xl">Edit product</DialogTitle>
                </DialogHeader>
                <form onSubmit={editHandle(saveEditProduct)} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Name</Label>
                    <Input {...editReg("name")} />
                    {editErr.name && (
                      <p className="text-xs text-destructive">{editErr.name.message as string}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Image</Label>
                    <ImageUpload
                      value={editWatch("image_url")}
                      onChange={(v) => editSet("image_url", v)}
                      folder="products"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Link</Label>
                    <Input {...editReg("external_link")} placeholder="https://kaspi.kz/…" />
                  </div>
                  <Button type="submit" className="w-full" disabled={editSub}>
                    Save changes
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Collection meta */}
          <aside className="space-y-4 rounded-3xl border border-border bg-card p-6 lg:sticky lg:top-24 lg:self-start">
            <h2 className="font-display text-xl font-semibold">Collection details</h2>
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Cover image</Label>
              <ImageUpload value={cover} onChange={setCover} folder="covers" />
              {cover && (
                <img
                  src={cover}
                  alt=""
                  className="mt-2 aspect-[16/10] w-full rounded-xl object-cover"
                />
              )}
            </div>
            <Button onClick={saveCollection} className="w-full">
              Save details
            </Button>
          </aside>
        </div>
      </div>
      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} type="products" />
    </div>
  );
}
