"use client"
import { useState, type ReactNode, useMemo } from "react"
import {
  Search,
  Barcode,
  HeartCrack as ChartBarStacked,
  Tag,
  Tags,
  Hammer as Hamburger,
  GlassWater,
  Car,
  KeySquare,
  CarFront,
  CreditCard,
  Loader,
  LoaderCircle,
} from "lucide-react"
import { productData, type ProductItem, type ProductCategory } from "./dummy"
import { ordersData, type Order, type OrderStatus } from "./dummy"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useCart } from "./cart-content"
import DynamicIsland from "./DynamicIsland"
import { useNotification } from "./notification-context"
import { usePreferences } from "@/app/providers/preferences-context"

type PillButtonProps = {
  icon: ReactNode
  label: string
  onClick?: () => void
}

type TileButtonProps = {
  icon: ReactNode
  label: string
}

type ProductCardProps = {
  id?: string
  name: string
  image: string
  price: number
  type: "product" | "service"
  description?: string
  onAdd?: () => void
}

function PillButton({ icon, label, onClick }: PillButtonProps) {
  const { isCustomize, getButtonColorClasses, getButtonLabel, setButtonPref, colorOptions } = usePreferences()
  const key = `center:pill:${label.toLowerCase().replace(/\s+/g, "-")}`
  const shownLabel = getButtonLabel(key, label)
  const color = getButtonColorClasses(key)
  return (
    <div className="rounded-lg border border-border bg-secondary p-2">
      <button
        type="button"
        onClick={onClick}
        className={["flex items-center gap-3 rounded-lg px-3 py-2 transition", color.bg, color.text].join(" ")}
      >
        <div className="grid h-10 w-10 place-items-center rounded-md border-2 border-dashed text-current">{icon}</div>
        <span className="text-sm">{shownLabel}</span>
      </button>
      {isCustomize && (
        <div className="mt-2 space-y-2">
          <input
            className="w-full rounded-md border border-border bg-card text-foreground text-xs px-2 py-1"
            defaultValue={shownLabel}
            onBlur={(e) => setButtonPref(key, { label: e.currentTarget.value })}
          />
          <div className="flex flex-wrap gap-1">
            {colorOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setButtonPref(key, { color: opt.key })}
                className={["h-5 w-5 rounded", opt.classes.bg].join(" ")}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SearchPill({
  query,
  setQuery,
  placeholder,
  onSubmit,
}: {
  query: string
  setQuery: (v: string) => void
  placeholder: string
  onSubmit: () => void
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
      className="flex items-center gap-3 rounded-lg border border-border bg-secondary px-3 py-2"
    >
      <div className="grid h-6 w-6 place-items-center rounded-md border-2 border-dashed text-muted-foreground">
        <Search className="h-4 w-4" />
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
      />
    </form>
  )
}

function TileButton({
  icon,
  label,
  active,
  highlighted,
  onClick,
}: TileButtonProps & {
  active?: boolean
  highlighted?: boolean
  onClick?: () => void
}) {
  const { isCustomize, getButtonColorClasses, getButtonLabel, setButtonPref, colorOptions } = usePreferences()
  const key = `center:tile:${label.toLowerCase().replace(/\s+/g, "-")}`
  const shownLabel = getButtonLabel(key, label)
  const color = getButtonColorClasses(key)
  return (
    <div className="rounded-lg border border-border p-2">
      <button
        type="button"
        onClick={onClick}
        className={[
          "rounded-lg border p-4 text-center transition w-full",
          color.bg,
          color.text,
          active ? "ring-2" : "",
          !active && highlighted ? "ring-1" : "",
        ].join(" ")}
      >
        <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-md border-2 border-dashed text-current">
          {icon}
        </div>
        <div className="text-xs font-rubik font-medium">{shownLabel}</div>
      </button>
      {isCustomize && (
        <div className="mt-2 space-y-2">
          <input
            className="w-full rounded-md border border-border bg-card text-foreground text-xs px-2 py-1"
            defaultValue={shownLabel}
            onBlur={(e) => setButtonPref(key, { label: e.currentTarget.value })}
          />
          <div className="flex flex-wrap gap-1">
            {colorOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setButtonPref(key, { color: opt.key })}
                className={["h-5 w-5 rounded", opt.classes.bg].join(" ")}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ProductCard({ id, name, image, price, type, description, onAdd }: ProductCardProps) {
  const { isCustomize, getProductImage, setProductImage } = usePreferences()
  const finalImage = id ? getProductImage(id, image) : image

  return (
    <div className="text-left rounded-lg border border-border bg-card p-3 hover:shadow transition">
      <button type="button" onClick={onAdd} aria-label={`Tambah ${name} ke pesanan`} className="w-full">
        <div className="grid place-items-center rounded-lg border border-border bg-secondary">
          <img
            src={finalImage || "/placeholder.svg?height=140&width=240&query=gambar-produk"}
            alt={name}
            className="h-[140px] w-full rounded-lg object-cover"
          />
        </div>
        <div className="mt-3 font-bold  font-rubik text-foreground">{name}</div>
        <div className="text-xs text-muted-foreground">
          {type === "service" ? "Service" : "Product"} • Rp{price.toLocaleString("id-ID")}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">{description}</div>
      </button>
      {isCustomize && id && (
        <div className="mt-2 flex gap-2">
          <input
            className="flex-1 rounded-md border border-border bg-card text-foreground text-xs px-2 py-1"
            placeholder="URL gambar produk..."
            defaultValue={finalImage}
            onBlur={(e) => setProductImage(id, e.currentTarget.value)}
          />
          <button
            type="button"
            className="px-2 rounded-md bg-primary text-primary-foreground text-xs"
            onClick={() => {
              const url = prompt("Masukkan URL gambar untuk produk ini", finalImage || "")
              if (url !== null) setProductImage(id, url)
            }}
          >
            Ubah
          </button>
        </div>
      )}
    </div>
  )
}

const pillButtonsData: PillButtonProps[] = [
  { icon: <Loader className="w-6 h-6" />, label: "In Queue" },
  { icon: <LoaderCircle className="w-6 h-6" />, label: "In Process" },
  { icon: <CreditCard className="w-6 h-6" />, label: "Waiting Payment" },
]

const tileButtonData: TileButtonProps[] = [
  { icon: <Hamburger className="w-6 h-6" />, label: "Food" },
  { icon: <GlassWater className="w-6 h-6" />, label: "Drinks" },
  { icon: <Car className="w-6 h-6" />, label: "Car Care" },
  { icon: <KeySquare className="w-6 h-6" />, label: "Cleaning" },
  { icon: <CarFront className="w-6 h-6" />, label: "Accessories" },
]

export default function CenterMock() {
  const [page, setPage] = useState(0)
  const pillsPerPage = 3
  const totalPages = Math.ceil(pillButtonsData.length / pillsPerPage)
  const visiblePills = pillButtonsData.slice(page * pillsPerPage, (page + 1) * pillsPerPage)

  const [detailMode, setDetailMode] = useState<null | "services" | "non-services">(null)
  const [selectedTiles, setSelectedTiles] = useState<Set<ProductCategory>>(new Set())
  const [searchType, setSearchType] = useState<"barcode" | "category" | "name" | "itemId">("name")
  const [query, setQuery] = useState("")

  const [modalOpen, setModalOpen] = useState(false)
  const [modalStatus, setModalStatus] = useState<null | OrderStatus>(null)
  const ordersForStatus = useMemo<Order[]>(() => {
    return modalStatus ? ordersData.filter((o) => o.status === modalStatus) : []
  }, [modalStatus])

  const handleToggleTile = (label: string) => {
    const cat = label as ProductCategory
    const next = new Set(selectedTiles)
    if (next.has(cat)) next.delete(cat)
    else next.add(cat)
    setSelectedTiles(next)
  }

  const serviceCats: ProductCategory[] = ["Car Care", "Cleaning"]
  const nonServiceCats: ProductCategory[] = ["Food", "Drinks", "Accessories"]

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase()
    return productData.filter((p) => {
      const tileOk = selectedTiles.size === 0 ? true : selectedTiles.has(p.category)
      if (!q) return tileOk
      let hay = ""
      switch (searchType) {
        case "barcode":
          hay = p.barcode.toLowerCase()
          break
        case "category":
          hay = p.category.toLowerCase()
          break
        case "itemId":
          hay = p.itemId.toLowerCase()
          break
        case "name":
        default:
          hay = p.name.toLowerCase()
      }
      const searchOk = hay.includes(q)
      return tileOk && searchOk
    })
  }, [query, searchType, selectedTiles])

  const { addItem } = useCart()
  const { notif, clearNotif } = useNotification()

  return (
    <div className="flex flex-col gap-4 relative">
      <DynamicIsland
        type={notif.type as any}
        message={notif.message}
        amount={notif.amount}
        method={notif.method}
        onClose={clearNotif}
      />

      <div className="h-12 w-1/2 rounded-md flex items-left text-4xl text-foreground font-rubik font-bold tracking-wide ">
        Ongoing Order
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visiblePills.map((pill) => (
          <PillButton
            key={pill.label}
            icon={pill.icon}
            label={pill.label}
            onClick={() => {
              setModalStatus(pill.label as OrderStatus)
              setModalOpen(true)
            }}
          />
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button
            className="px-2 py-1 rounded bg-secondary text-foreground border border-border disabled:opacity-40"
            onClick={() => setPage(page - 1)}
            disabled={page === 0}
          >
            ←
          </button>
          <span className="text-foreground text-sm">
            {page + 1} / {totalPages}
          </span>
          <button
            className="px-2 py-1 rounded bg-secondary text-foreground border border-border disabled:opacity-40"
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages - 1}
          >
            →
          </button>
        </div>
      )}

      <hr className="border-t-4 border-border" />
      <div className="h-12 w-1/2 rounded-md flex items-left text-3xl text-foreground font-rubik font-bold tracking-wide">
        Detailing
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <button
          type="button"
          onClick={() => setDetailMode(detailMode === "services" ? null : "services")}
          className={[
            "rounded-lg border px-4 py-3",
            "bg-secondary border-border text-foreground",
            detailMode === "services" ? "ring-2" : "",
          ].join(" ")}
        >
          Services
        </button>
        <button
          type="button"
          onClick={() => setDetailMode(detailMode === "non-services" ? null : "non-services")}
          className={[
            "rounded-lg border px-4 py-3",
            "bg-secondary border-border text-foreground",
            detailMode === "non-services" ? "ring-2" : "",
          ].join(" ")}
        >
          Non-Services
        </button>
      </div>

      <hr className="border-t-4 border-border" />

      <div className="h-12 w-1/2 rounded-md flex items-left text-3xl text-foreground font-rubik font-bold tracking-wide">
        Main menu
      </div>

      <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-[repeat(4,90px)_1fr]">
        <button
          type="button"
          onClick={() => setSearchType("barcode")}
          className={[
            "flex flex-col items-center justify-center rounded-lg border p-2",
            "bg-secondary border-border",
            searchType === "barcode" ? "ring-2" : "",
          ].join(" ")}
        >
          <div className="grid h-10 w-10 place-items-center rounded-md border-2 border-dashed text-muted-foreground">
            <Barcode className="h-5 w-5" />
          </div>
          <span className="mt-1 text-xs text-foreground">Barcode</span>
        </button>

        <button
          type="button"
          onClick={() => setSearchType("category")}
          className={[
            "flex flex-col items-center justify-center rounded-lg border p-2",
            "bg-secondary border-border",
            searchType === "category" ? "ring-2" : "",
          ].join(" ")}
        >
          <div className="grid h-10 w-10 place-items-center rounded-md border-2 border-dashed text-muted-foreground">
            <ChartBarStacked className="h-5 w-5" />
          </div>
          <span className="mt-1 text-xs text-foreground">Category</span>
        </button>

        <button
          type="button"
          onClick={() => setSearchType("name")}
          className={[
            "flex flex-col items-center justify-center rounded-lg border p-2",
            "bg-secondary border-border",
            searchType === "name" ? "ring-2" : "",
          ].join(" ")}
        >
          <div className="grid h-10 w-10 place-items-center rounded-md border-2 border-dashed text-muted-foreground">
            <Tag className="h-5 w-5" />
          </div>
          <span className="mt-1 text-xs text-foreground">Name</span>
        </button>

        <button
          type="button"
          onClick={() => setSearchType("itemId")}
          className={[
            "flex flex-col items-center justify-center rounded-lg border p-2",
            "bg-secondary border-border",
            searchType === "itemId" ? "ring-2" : "",
          ].join(" ")}
        >
          <div className="grid h-10 w-10 place-items-center rounded-md border-2 border-dashed text-muted-foreground">
            <Tags className="h-5 w-5" />
          </div>
          <span className="mt-1 text-xs text-foreground">Item ID</span>
        </button>

        <SearchPill
          query={query}
          setQuery={setQuery}
          placeholder={
            searchType === "barcode"
              ? "Cari berdasarkan barcode..."
              : searchType === "category"
                ? "Cari berdasarkan kategori..."
                : searchType === "itemId"
                  ? "Cari berdasarkan Item ID..."
                  : "Cari berdasarkan nama..."
          }
          onSubmit={() => {}}
        />
      </div>

      <div className="overflow-auto max-h-[600px]">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map((p: ProductItem) => (
            <ProductCard
              key={p.id}
              id={p.id}
              name={p.name}
              image={p.image}
              price={p.price}
              type={p.type}
              description={p.description}
              onAdd={() => addItem(p)}
            />
          ))}
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{modalStatus ?? "Orders"}</DialogTitle>
            <DialogDescription>Daftar order untuk status ini.</DialogDescription>
          </DialogHeader>

          <div className="max-h-96 overflow-auto grid gap-3">
            {ordersForStatus.length === 0 ? (
              <div className="text-sm text-muted-foreground">Belum ada order.</div>
            ) : (
              ordersForStatus.map((o) => (
                <div key={o.id} className="rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold font-rubik text-foreground">Order {o.orderNo}</div>
                    <div className="text-xs text-muted-foreground">{o.createdAt}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">Customer: {o.customer || "-"}</div>
                  <ul className="mt-2 text-xs text-foreground/90 grid gap-1">
                    {o.items.map((it, idx) => (
                      <li key={idx} className="flex justify-between">
                        <span>
                          {it.productName} × {it.qty}
                        </span>
                        <span>Rp{(it.price * it.qty).toLocaleString("id-ID")}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
