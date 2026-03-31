"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Camera, Pencil, Plus, RefreshCw, Trash2, Wine } from "lucide-react";

import { KpiCard } from "@/components/cards/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import { getWineDisplayTitle } from "@/lib/wine-display";
import { formatWinePlacement } from "@/lib/wine-location-display";
import { isCellarWine, type StorageLocation, type WineBottle } from "@/lib/wine-data";
import { inferReadinessFromVintage } from "@/lib/wine-readiness";

const readinessOptions = ["Hold", "Ready", "Peak"] as const;
const grapeOptions = [
  "Cabernet Sauvignon",
  "Merlot",
  "Cabernet Franc",
  "Syrah",
  "Grenache",
  "Pinot Noir",
  "Sangiovese",
  "Nebbiolo",
  "Tempranillo",
  "Malbec",
  "Mourvedre",
  "Chardonnay",
  "Sauvignon Blanc",
  "Chenin Blanc",
  "Riesling",
  "Moscato Bianco",
  "Gamay",
  "Semillon",
  "Viognier",
  "Blend",
  "Other"
] as const;
const regionOptions = [
  "Judean Hills",
  "Galilee",
  "Golan Heights",
  "Upper Galilee",
  "Lower Galilee",
  "Negev",
  "Champagne",
  "Bordeaux",
  "Burgundy",
  "Rhone",
  "Loire Valley",
  "Provence",
  "Alsace",
  "Chablis",
  "Rioja",
  "Ribera del Duero",
  "Piedmont",
  "Tuscany",
  "Veneto",
  "Sicily",
  "Napa Valley",
  "Sonoma",
  "Willamette Valley",
  "Paso Robles",
  "Mendoza",
  "Maipo Valley",
  "Colchagua Valley",
  "Douro",
  "Mosel",
  "Priorat",
  "Other"
] as const;
const countryOptions = ["Israel", "Italy", "France", "Spain", "USA", "Portugal", "Australia", "Other"] as const;
const styleOptions = ["Red", "White", "Rose", "Other"] as const;

type WineFormState = {
  wineName: string;
  producer: string;
  imageUrl: string;
  vintage: string;
  region: string;
  country: string;
  grape: string;
  style: string;
  bottleSize: string;
  quantity: string;
  purchasePrice: string;
  estimatedValue: string;
  vivinoLink: string;
  vivinoScore: string;
  robertParkerScore: string;
  jamesSucklingScore: string;
  criticSource: string;
  locationId: string;
  shelf: string;
  slot: string;
  readiness: (typeof readinessOptions)[number];
  drinkWindow: string;
  acquiredOn: string;
  supplierId: string;
  notes: string;
};

const emptyForm: WineFormState = {
  wineName: "",
  producer: "",
  imageUrl: "",
  vintage: "",
  region: "",
  country: "",
  grape: "",
  style: "",
  bottleSize: "750ml",
  quantity: "1",
  purchasePrice: "",
  estimatedValue: "",
  vivinoLink: "",
  vivinoScore: "",
  robertParkerScore: "",
  jamesSucklingScore: "",
  criticSource: "",
  locationId: "",
  shelf: "",
  slot: "",
  readiness: "Ready",
  drinkWindow: "",
  acquiredOn: new Date().toISOString().slice(0, 10),
  supplierId: "",
  notes: ""
};

function normalizeGrape(value: string | undefined) {
  const nextValue = value?.trim() ?? "";

  if (!nextValue) {
    return "";
  }

  if (/blend/i.test(nextValue)) {
    return "Blend";
  }

  return grapeOptions.includes(nextValue as (typeof grapeOptions)[number]) ? nextValue : "Other";
}

function normalizeRegion(value: string | undefined) {
  const nextValue = value?.trim() ?? "";
  return nextValue && regionOptions.includes(nextValue as (typeof regionOptions)[number]) ? nextValue : nextValue ? "Other" : "";
}

function normalizeCountry(value: string | undefined) {
  const nextValue = value?.trim() ?? "";
  return nextValue && countryOptions.includes(nextValue as (typeof countryOptions)[number]) ? nextValue : nextValue ? "Other" : "";
}

function normalizeStyle(value: string | undefined) {
  const nextValue = value?.trim() ?? "";
  return nextValue && styleOptions.includes(nextValue as (typeof styleOptions)[number]) ? nextValue : nextValue ? "Other" : "";
}

function toFormState(wine: Partial<WineBottle>, locations: StorageLocation[]): WineFormState {
  return {
    wineName: wine.wineName ?? "",
    producer: wine.producer ?? "",
    imageUrl: wine.imageUrl ?? "",
    vintage: wine.vintage ? String(wine.vintage) : "",
    region: normalizeRegion(wine.region),
    country: normalizeCountry(wine.country),
    grape: normalizeGrape(wine.grape),
    style: normalizeStyle(wine.style),
    bottleSize: wine.bottleSize ?? "750ml",
    quantity: String(wine.quantity ?? 1),
    purchasePrice: wine.purchasePrice && wine.purchasePrice > 0 ? String(wine.purchasePrice) : "",
    estimatedValue: wine.estimatedValue && wine.estimatedValue > 0 ? String(wine.estimatedValue) : "",
    vivinoLink: wine.vivinoLink ?? "",
    vivinoScore: wine.vivinoScore && wine.vivinoScore > 0 ? String(wine.vivinoScore) : "",
    robertParkerScore: wine.robertParkerScore && wine.robertParkerScore > 0 ? String(wine.robertParkerScore) : "",
    jamesSucklingScore: wine.jamesSucklingScore && wine.jamesSucklingScore > 0 ? String(wine.jamesSucklingScore) : "",
    criticSource: wine.criticSource ?? "",
    locationId: wine.locationId ?? locations[0]?.id ?? "",
    shelf: wine.shelf ?? "",
    slot: wine.slot ?? "",
    readiness: (wine.readiness as WineFormState["readiness"]) ?? "Ready",
    drinkWindow: wine.drinkWindow ?? "",
    acquiredOn: wine.acquiredOn ?? new Date().toISOString().slice(0, 10),
    supplierId: wine.supplierId ?? "",
    notes: wine.notes ?? ""
  };
}

function getReadinessVariant(readiness: WineBottle["readiness"]) {
  if (readiness === "Peak") {
    return "danger";
  }

  if (readiness === "Ready") {
    return "warning";
  }

  return "info";
}

export function WineInventoryPanel({ query = "" }: { query?: string }) {
  const [wines, setWines] = useState<WineBottle[]>([]);
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [inventoryTab, setInventoryTab] = useState<"cellar" | "drank">("cellar");
  const [locationFilter, setLocationFilter] = useState("all");
  const [readinessFilter, setReadinessFilter] = useState<"all" | WineBottle["readiness"]>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [editingWine, setEditingWine] = useState<WineBottle | null>(null);
  const [form, setForm] = useState<WineFormState>(emptyForm);
  const [scanText, setScanText] = useState("");
  const [scanImageUrl, setScanImageUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const normalizedQuery = query.trim().toLowerCase();

  const readResponsePayload = async <T,>(response: Response) => {
    const text = await response.text();

    if (!text) {
      return {} as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      return { error: "The server returned an invalid response." } as T;
    }
  };

  const loadWines = async () => {
    const response = await fetch("/api/wines", { cache: "no-store" });
    const payload = (await response.json()) as { data?: WineBottle[] };
    setWines(payload.data ?? []);
  };

  const loadLocations = async () => {
    const response = await fetch("/api/locations", { cache: "no-store" });
    const payload = (await response.json()) as { data?: StorageLocation[] };
    const nextLocations = payload.data ?? [];
    setLocations(nextLocations);

    setForm((current) =>
      current.locationId || nextLocations.length === 0
        ? current
        : {
            ...current,
            locationId: nextLocations[0].id
          }
    );
  };

  useEffect(() => {
    void loadWines();
    void loadLocations();
  }, []);

  const applyFilters = (candidateWines: WineBottle[]) =>
    candidateWines.filter((wine) => {
      const location = locations.find((item) => item.id === wine.locationId);
      const matchesQuery =
        !normalizedQuery ||
        [
          wine.wineName,
          wine.producer,
          wine.region,
          wine.country,
          wine.grape,
          wine.style,
          location?.name ?? "",
          wine.shelf,
          wine.slot
        ].some((value) => value.toLowerCase().includes(normalizedQuery));

      const matchesLocation = locationFilter === "all" || wine.locationId === locationFilter;
      const matchesReadiness = readinessFilter === "all" || wine.readiness === readinessFilter;

      return matchesQuery && matchesLocation && matchesReadiness;
    });

  const cellarWines = useMemo(() => wines.filter(isCellarWine), [wines]);
  const drankWines = useMemo(() => wines.filter((wine) => !isCellarWine(wine)), [wines]);

  const filteredCellarWines = useMemo(
    () =>
      applyFilters(cellarWines),
    [cellarWines, locationFilter, locations, normalizedQuery, readinessFilter]
  );

  const filteredDrankWines = useMemo(
    () => applyFilters(drankWines),
    [drankWines, locationFilter, locations, normalizedQuery, readinessFilter]
  );

  const visibleWines = inventoryTab === "cellar" ? filteredCellarWines : filteredDrankWines;

  const totalBottles = filteredCellarWines.reduce((sum, wine) => sum + wine.quantity, 0);
  const currentValue = filteredCellarWines.reduce((sum, wine) => sum + wine.estimatedValue * wine.quantity, 0);
  const averageScore =
    filteredCellarWines.length > 0
      ? filteredCellarWines.reduce((sum, wine) => sum + wine.vivinoScore, 0) / filteredCellarWines.length
      : 0;
  const readyCount = filteredCellarWines.filter((wine) => wine.readiness !== "Hold").length;

  const updateForm = (key: keyof WineFormState, value: string) => {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === "vintage"
        ? {
            readiness: value.trim() && Number.isFinite(Number(value)) ? inferReadinessFromVintage(Number(value)) : "Ready"
          }
        : {})
    }));
  };

  const readImageFile = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => reject(new Error("Unable to read image file."));
      reader.readAsDataURL(file);
    });

  const updateWineImage = async (file: File | null) => {
    if (!file) {
      updateForm("imageUrl", "");
      return;
    }

    try {
      updateForm("imageUrl", await readImageFile(file));
    } catch {
      setError("Unable to load that bottle image.");
    }
  };

  const updateScanImage = async (file: File | null) => {
    if (!file) {
      setScanImageUrl("");
      return;
    }

    try {
      setScanImageUrl(await readImageFile(file));
    } catch {
      setScanError("Unable to load that bottle image.");
    }
  };

  const resetForm = () => {
    setForm({
      ...emptyForm,
      locationId: locations[0]?.id ?? ""
    });
    setEditingWine(null);
    setError(null);
    setScanImageUrl("");
  };

  const resetScanAssist = () => {
    setScanText("");
    setScanImageUrl("");
    setScanError(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openScanDialog = () => {
    resetScanAssist();
    setScanDialogOpen(true);
  };

  const openEditDialog = (wine: WineBottle) => {
    setEditingWine(wine);
    setForm(toFormState(wine, locations));
    setError(null);
    setDialogOpen(true);
  };

  const submitWine = () => {
    if (!form.wineName.trim() || !form.producer.trim()) {
      setError("Wine name and producer are required.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const response = await fetch(editingWine ? `/api/wines/${editingWine.id}` : "/api/wines", {
        method: editingWine ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          wineName: form.wineName,
          producer: form.producer,
          imageUrl: form.imageUrl,
          vintage: form.vintage.trim() ? Number(form.vintage) : undefined,
          region: form.region,
          country: form.country,
          grape: form.grape,
          style: form.style,
          bottleSize: form.bottleSize,
          quantity: Number(form.quantity),
          purchasePrice: Number(form.purchasePrice || 0),
          estimatedValue: Number(form.estimatedValue || 0),
          vivinoLink: form.vivinoLink,
          vivinoScore: Number(form.vivinoScore || 0),
          robertParkerScore: Number(form.robertParkerScore || 0),
          jamesSucklingScore: Number(form.jamesSucklingScore || 0),
          criticSource: form.criticSource,
          locationId: form.locationId,
          shelf: form.shelf,
          slot: form.slot,
          readiness: form.readiness,
          drinkWindow: form.drinkWindow,
          acquiredOn: form.acquiredOn,
          supplierId: form.supplierId,
          notes: form.notes
        })
      });

      if (!response.ok) {
        const payload = await readResponsePayload<{ error?: string }>(response);
        setError(payload.error ?? "Unable to save this wine.");
        return;
      }

      const payload = await readResponsePayload<{ data?: WineBottle }>(response);
      const savedWine = payload.data;

      await Promise.all([loadWines(), loadLocations()]);
      setDialogOpen(false);
      resetForm();

      if (savedWine) {
        void (async () => {
          const enrichResponse = await fetch(`/api/wines/${savedWine.id}/enrich`, {
            method: "POST"
          });

          if (enrichResponse.ok) {
            await loadWines();
          }
        })();
      }
    });
  };

  const removeWine = (wine: WineBottle) => {
    const confirmed = window.confirm(`Delete ${wine.producer} ${wine.wineName}?`);

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      await fetch(`/api/wines/${wine.id}`, { method: "DELETE" });
      await Promise.all([loadWines(), loadLocations()]);
    });
  };

  const markAsDrank = (wine: WineBottle) => {
    const confirmed = window.confirm(`Mark ${wine.producer} ${wine.wineName} as drank?`);

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/wines/${wine.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          cellarStatus: "Drank",
          drankOn: new Date().toISOString().slice(0, 10)
        })
      });

      if (!response.ok) {
        setError("Unable to move this wine to Drank.");
        return;
      }

      await Promise.all([loadWines(), loadLocations()]);
      setInventoryTab("drank");
    });
  };

  const refreshVivino = (wine: WineBottle) => {
    startTransition(async () => {
      const response = await fetch(`/api/wines/${wine.id}/enrich`, {
        method: "POST"
      });

      if (!response.ok) {
        setError("Unable to refresh Vivino data for this wine.");
        return;
      }

      await loadWines();
    });
  };

  const generateDraftFromScan = () => {
    if (!scanText.trim()) {
      setScanError("Paste label text or OCR output first.");
      return;
    }

    setScanError(null);
    startTransition(async () => {
      const response = await fetch("/api/wines/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          rawText: scanText,
          imageUrl: scanImageUrl
        })
      });

      if (!response.ok) {
        setScanError("Unable to generate a draft from that text.");
        return;
      }

      const payload = (await response.json()) as { data?: Partial<WineBottle> };

      setForm(toFormState(payload.data ?? {}, locations));
      setEditingWine(null);
      setScanDialogOpen(false);
      resetScanAssist();
      setDialogOpen(true);
    });
  };

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Inventory</p>
        <h2 className="text-3xl font-semibold tracking-tight">Track every bottle by fridge, shelf, value, and Vivino context.</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Add bottles manually or use scan assist: paste OCR text from a bottle photo, review the suggested metadata, and save it into the right storage location.
        </p>
      </section>

      <Card>
        <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardDescription>Inventory Views</CardDescription>
            <CardTitle>{inventoryTab === "cellar" ? "In Cellar" : "Drank"}</CardTitle>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant={inventoryTab === "cellar" ? "default" : "outline"} onClick={() => setInventoryTab("cellar")}>
              In Cellar ({cellarWines.length})
            </Button>
            <Button variant={inventoryTab === "drank" ? "default" : "outline"} onClick={() => setInventoryTab("drank")}>
              Drank ({drankWines.length})
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {inventoryTab === "cellar"
              ? "Active cellar bottles stay in inventory totals, value, readiness windows, producer summaries, and storage counts."
              : "Drank bottles are archived here. Their data stays visible, but they are read-only and excluded from all active inventory calculations."}
          </p>
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Filtered Bottles" value={String(totalBottles)} trend={`${filteredCellarWines.length} active wine entries in view`} />
        <KpiCard label="Inventory Value" value={formatCurrency(currentValue)} trend="Estimated current cellar value" tone="success" />
        <KpiCard label="Average Vivino Score" value={averageScore.toFixed(2)} trend="Weighted by visible labels" tone="warning" />
        <KpiCard label="Ready Or Peak" value={String(readyCount)} trend="Bottles suitable for near-term service" tone="danger" />
      </section>

      <Card>
        <CardHeader className="gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <CardDescription>Filters and actions</CardDescription>
            <CardTitle>Find bottles fast or add a new one</CardTitle>
          </div>
          <div className="flex flex-col gap-3 md:flex-row">
            <Button variant="outline" onClick={openScanDialog}>
              <Camera className="h-4 w-4" />
              Scan Assist
            </Button>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4" />
              Add Wine
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Location</p>
            <NativeSelect value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)}>
              <option value="all">All locations</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Readiness</p>
            <NativeSelect value={readinessFilter} onChange={(event) => setReadinessFilter(event.target.value as "all" | WineBottle["readiness"])}>
              <option value="all">All windows</option>
              {readinessOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </NativeSelect>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto" side="right">
          <DialogHeader>
            <DialogTitle>{editingWine ? "Edit Wine" : "Add Wine"}</DialogTitle>
            <DialogDescription>Save bottle details, shelf placement, pricing, and a direct Vivino wine page when we can resolve one.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Input placeholder="Wine name" value={form.wineName} onChange={(event) => updateForm("wineName", event.target.value)} />
              <Input placeholder="Producer" value={form.producer} onChange={(event) => updateForm("producer", event.target.value)} />
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <p className="text-sm font-medium">Bottle image</p>
                <input
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-xl file:border-0 file:bg-secondary file:px-4 file:py-2 file:text-sm file:font-medium file:text-foreground hover:file:bg-secondary/80"
                  type="file"
                  accept="image/*"
                  onChange={(event) => void updateWineImage(event.target.files?.[0] ?? null)}
                />
              </div>
              {form.imageUrl ? (
                <div className="flex items-start gap-4 rounded-2xl border border-border/80 bg-secondary/40 p-3">
                  <img src={form.imageUrl} alt="Bottle preview" className="h-32 w-24 rounded-xl object-cover" />
                  <Button type="button" variant="ghost" onClick={() => updateForm("imageUrl", "")}>
                    Remove image
                  </Button>
                </div>
              ) : null}
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Input placeholder="Vintage" value={form.vintage} onChange={(event) => updateForm("vintage", event.target.value)} />
              <NativeSelect value={form.region} onChange={(event) => updateForm("region", event.target.value)}>
                <option value="">Select region</option>
                {regionOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </NativeSelect>
              <NativeSelect value={form.country} onChange={(event) => updateForm("country", event.target.value)}>
                <option value="">Select country</option>
                {countryOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <NativeSelect value={form.grape} onChange={(event) => updateForm("grape", event.target.value)}>
                <option value="">Select grape</option>
                {grapeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </NativeSelect>
              <NativeSelect value={form.style} onChange={(event) => updateForm("style", event.target.value)}>
                <option value="">Select style</option>
                {styleOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </NativeSelect>
              <Input placeholder="Bottle size" value={form.bottleSize} onChange={(event) => updateForm("bottleSize", event.target.value)} />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Input placeholder="Quantity" value={form.quantity} onChange={(event) => updateForm("quantity", event.target.value)} />
              <Input placeholder="Buy price" value={form.purchasePrice} onChange={(event) => updateForm("purchasePrice", event.target.value)} />
              <Input placeholder="Estimated value" value={form.estimatedValue} onChange={(event) => updateForm("estimatedValue", event.target.value)} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Input placeholder="Vivino link" value={form.vivinoLink} onChange={(event) => updateForm("vivinoLink", event.target.value)} />
              <Input placeholder="Vivino score" value={form.vivinoScore} onChange={(event) => updateForm("vivinoScore", event.target.value)} />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Input
                placeholder="Robert Parker score"
                value={form.robertParkerScore}
                onChange={(event) => updateForm("robertParkerScore", event.target.value)}
              />
              <Input
                placeholder="James Suckling score"
                value={form.jamesSucklingScore}
                onChange={(event) => updateForm("jamesSucklingScore", event.target.value)}
              />
              <Input placeholder="Critic source" value={form.criticSource} onChange={(event) => updateForm("criticSource", event.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">
              Auto-fill is best-effort only. Vivino uses browser enrichment, while Robert Parker and James Suckling can be filled manually or from configured Wine-Searcher / Global Wine Score API access.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <NativeSelect value={form.locationId} onChange={(event) => updateForm("locationId", event.target.value)}>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </NativeSelect>
              <Input placeholder="Merchant / source" value={form.supplierId} onChange={(event) => updateForm("supplierId", event.target.value)} />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Input placeholder="Shelf" value={form.shelf} onChange={(event) => updateForm("shelf", event.target.value)} />
              <Input placeholder="Slot" value={form.slot} onChange={(event) => updateForm("slot", event.target.value)} />
              <NativeSelect value={form.readiness} onChange={(event) => updateForm("readiness", event.target.value)}>
                {readinessOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Input placeholder="Drink window" value={form.drinkWindow} onChange={(event) => updateForm("drinkWindow", event.target.value)} />
              <Input type="date" value={form.acquiredOn} onChange={(event) => updateForm("acquiredOn", event.target.value)} />
            </div>
            <Textarea placeholder="Notes" value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} />
            {error ? <p className="text-sm text-rose-500">{error}</p> : null}
            <Button onClick={submitWine} disabled={isPending}>
              {editingWine ? "Save Changes" : "Create Wine"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={scanDialogOpen}
        onOpenChange={(open) => {
          setScanDialogOpen(open);

          if (!open) {
            resetScanAssist();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scan Assist</DialogTitle>
            <DialogDescription>
              Paste OCR text from a bottle photo or label scan. The app will draft the wine details for review before saving.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Bottle image</p>
              <input
                className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-xl file:border-0 file:bg-secondary file:px-4 file:py-2 file:text-sm file:font-medium file:text-foreground hover:file:bg-secondary/80"
                type="file"
                accept="image/*"
                onChange={(event) => void updateScanImage(event.target.files?.[0] ?? null)}
              />
            </div>
            {scanImageUrl ? <img src={scanImageUrl} alt="Scanned bottle preview" className="h-40 w-28 rounded-xl object-cover" /> : null}
            <Textarea
              placeholder="Example: Domaine Tempier Bandol Rouge 2019 Mourvedre France"
              value={scanText}
              onChange={(event) => setScanText(event.target.value)}
            />
            {scanError ? <p className="text-sm text-rose-500">{scanError}</p> : null}
            <Button onClick={generateDraftFromScan} disabled={isPending}>
              Generate Draft
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4">
        {visibleWines.map((wine) => {
          const location = locations.find((item) => item.id === wine.locationId);
          const headerMeta = [wine.vintage ? String(wine.vintage) : "", wine.region, wine.country].filter(Boolean).join(" • ");
          const placement = formatWinePlacement(wine.shelf, wine.slot);

          return (
            <Card key={wine.id}>
              <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardDescription>{headerMeta}</CardDescription>
                  <CardTitle>{getWineDisplayTitle(wine)}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  {isCellarWine(wine) ? <Badge variant={getReadinessVariant(wine.readiness)}>{wine.readiness}</Badge> : <Badge variant="info">Drank</Badge>}
                  <Badge variant="info">{wine.vivinoScore.toFixed(1)} Vivino</Badge>
                  {wine.robertParkerScore > 0 ? <Badge variant="warning">RP {wine.robertParkerScore}</Badge> : null}
                  {wine.jamesSucklingScore > 0 ? <Badge variant="warning">JS {wine.jamesSucklingScore}</Badge> : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {wine.imageUrl ? (
                  <div className="flex justify-start">
                    <img src={wine.imageUrl} alt={getWineDisplayTitle(wine)} className="h-48 w-32 rounded-2xl object-cover shadow-sm" />
                  </div>
                ) : null}
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-3xl bg-secondary/60 p-4 text-sm">
                    <p className="text-muted-foreground">Location</p>
                    <p className="mt-1 font-medium text-foreground">{location?.name ?? "Unknown"}</p>
                    <p className="text-muted-foreground">{placement || "Shelf and slot not set"}</p>
                  </div>
                  <div className="rounded-3xl bg-secondary/60 p-4 text-sm">
                    <p className="text-muted-foreground">Quantity</p>
                    <p className="mt-1 font-medium text-foreground">{wine.quantity}</p>
                    <p className="text-muted-foreground">{wine.bottleSize}</p>
                  </div>
                  <div className="rounded-3xl bg-secondary/60 p-4 text-sm">
                    <p className="text-muted-foreground">Pricing</p>
                    <p className="mt-1 font-medium text-foreground">{formatCurrency(wine.purchasePrice)}</p>
                    <p className="text-muted-foreground">Value {formatCurrency(wine.estimatedValue)}</p>
                  </div>
                  <div className="rounded-3xl bg-secondary/60 p-4 text-sm">
                    <p className="text-muted-foreground">Merchant</p>
                    <p className="mt-1 font-medium text-foreground">{wine.supplierId || "Unassigned"}</p>
                    <p className="text-muted-foreground">{wine.cellarStatus === "Drank" && wine.drankOn ? `Drank on ${wine.drankOn}` : wine.drinkWindow}</p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">{wine.notes}</p>

                <div className="flex flex-wrap items-center gap-3">
                  {isCellarWine(wine) ? (
                    <Button variant="outline" onClick={() => openEditDialog(wine)}>
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>
                  ) : null}
                  {isCellarWine(wine) ? (
                    <Button variant="outline" onClick={() => markAsDrank(wine)} disabled={isPending}>
                      <Wine className="h-4 w-4" />
                      Drank
                    </Button>
                  ) : null}
                  {isCellarWine(wine) ? (
                    <Button variant="ghost" onClick={() => removeWine(wine)} disabled={isPending}>
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  ) : null}
                  {isCellarWine(wine) ? (
                    <Button variant="outline" onClick={() => refreshVivino(wine)} disabled={isPending}>
                      <RefreshCw className="h-4 w-4" />
                      Refresh Scores
                    </Button>
                  ) : null}
                  {wine.vivinoLink ? (
                    <Button asChild variant="outline">
                      <a href={wine.vivinoLink} target="_blank" rel="noreferrer">
                        Open Vivino
                      </a>
                    </Button>
                  ) : null}
                  {!isCellarWine(wine) ? <Badge variant="info">Read only</Badge> : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {visibleWines.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              {inventoryTab === "cellar"
                ? "No active bottles match the current filters."
                : "No drank bottles match the current filters."}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
