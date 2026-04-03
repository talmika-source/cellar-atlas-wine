"use client";

import { useEffect, useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { formatWinePlacement } from "@/lib/wine-location-display";
import { getWineDisplayTitle } from "@/lib/wine-display";
import { isCellarWine, type StorageLocation, type WineBottle } from "@/lib/wine-data";

type LocationFormState = {
  name: string;
  type: StorageLocation["type"];
  room: string;
  capacity: string;
  temperatureC: string;
  humidity: string;
  notes: string;
};

const emptyForm: LocationFormState = {
  name: "",
  type: "Fridge",
  room: "",
  capacity: "24",
  temperatureC: "12",
  humidity: "65",
  notes: ""
};

function toFormState(location: StorageLocation | null): LocationFormState {
  if (!location) {
    return emptyForm;
  }

  return {
    name: location.name,
    type: location.type,
    room: location.room,
    capacity: String(location.capacity),
    temperatureC: String(location.temperatureC),
    humidity: String(location.humidity),
    notes: location.notes
  };
}

export function StorageLocationsPanel() {
  const [wines, setWines] = useState<WineBottle[]>([]);
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<StorageLocation | null>(null);
  const [form, setForm] = useState<LocationFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const readResponsePayload = async (response: Response) => {
    const text = await response.text();

    if (!text) {
      return {};
    }

    try {
      return JSON.parse(text) as { error?: string };
    } catch {
      return { error: "The server returned an invalid response." };
    }
  };

  const load = async () => {
    const [wineResponse, locationResponse] = await Promise.all([
      fetch("/api/wines", { cache: "no-store" }),
      fetch("/api/locations", { cache: "no-store" })
    ]);

    const winePayload = (wineResponse.ok ? await readResponsePayload(wineResponse) : {}) as { data?: WineBottle[] };
    const locationPayload = (locationResponse.ok ? await readResponsePayload(locationResponse) : {}) as { data?: StorageLocation[] };
    setWines(winePayload.data ?? []);
    setLocations(locationPayload.data ?? []);
  };

  useEffect(() => {
    void load();
  }, []);

  const updateForm = (key: keyof LocationFormState, value: string) => {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  };

  const openCreate = () => {
    setEditingLocation(null);
    setForm(emptyForm);
    setError(null);
    setDialogOpen(true);
  };

  const openEdit = (location: StorageLocation) => {
    setEditingLocation(location);
    setForm(toFormState(location));
    setError(null);
    setDialogOpen(true);
  };

  const submitLocation = () => {
    if (!form.name.trim()) {
      setError("Location name is required.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const response = await fetch(editingLocation ? `/api/locations/${editingLocation.id}` : "/api/locations", {
        method: editingLocation ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          room: form.room,
          capacity: Number(form.capacity),
          temperatureC: Number(form.temperatureC),
          humidity: Number(form.humidity),
          notes: form.notes
        })
      });

      const payload = await readResponsePayload(response);

      if (!response.ok) {
        setError(payload.error ?? "Unable to save location.");
        return;
      }

      await load();
      setDialogOpen(false);
      setEditingLocation(null);
      setForm(emptyForm);
    });
  };

  const removeLocation = (location: StorageLocation) => {
    const confirmed = window.confirm(`Delete ${location.name}? This only works if no wines are assigned to it.`);

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/locations/${location.id}`, { method: "DELETE" });
      const payload = await readResponsePayload(response);

      if (!response.ok) {
        setError(payload.error ?? "Unable to delete location.");
        return;
      }

      await load();
    });
  };

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Locations</p>
        <h2 className="text-3xl font-semibold tracking-tight">Manage Fridges and Storage</h2>
      </section>

      <Card>
        <CardHeader className="gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <CardDescription>Location management</CardDescription>
            <CardTitle>Add, edit, or remove storage zones</CardTitle>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add Location
          </Button>
        </CardHeader>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLocation ? "Edit Location" : "Add Location"}</DialogTitle>
            <DialogDescription>Update the storage zone details used throughout inventory and overview.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Input placeholder="Location name" value={form.name} onChange={(event) => updateForm("name", event.target.value)} />
              <NativeSelect value={form.type} onChange={(event) => updateForm("type", event.target.value)}>
                <option value="Fridge">Fridge</option>
                <option value="Cellar">Cellar</option>
                <option value="Cabinet">Cabinet</option>
                <option value="Locker">Locker</option>
              </NativeSelect>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Input placeholder="Room" value={form.room} onChange={(event) => updateForm("room", event.target.value)} />
              <Input placeholder="Capacity" value={form.capacity} onChange={(event) => updateForm("capacity", event.target.value)} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Input placeholder="Temperature C" value={form.temperatureC} onChange={(event) => updateForm("temperatureC", event.target.value)} />
              <Input placeholder="Humidity %" value={form.humidity} onChange={(event) => updateForm("humidity", event.target.value)} />
            </div>
            <Textarea placeholder="Notes" value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} />
            {error ? <p className="text-sm text-rose-500">{error}</p> : null}
            <Button onClick={submitLocation} disabled={isPending}>
              {editingLocation ? "Save Location" : "Create Location"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <section className="grid gap-4 xl:grid-cols-2">
        {locations.map((location) => {
          const locationWines = wines.filter((wine) => wine.locationId === location.id && isCellarWine(wine));
          const bottleCount = locationWines.reduce((sum, wine) => sum + wine.quantity, 0);

          return (
            <Card key={location.id}>
              <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardDescription>
                    {location.type} • {location.room}
                  </CardDescription>
                  <CardTitle>{location.name}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(location)}>
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => removeLocation(location)} disabled={isPending}>
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-3xl bg-secondary/60 p-4">
                    <p className="text-sm text-muted-foreground">Capacity</p>
                    <p className="mt-2 text-2xl font-semibold">{location.capacity}</p>
                  </div>
                  <div className="rounded-3xl bg-secondary/60 p-4">
                    <p className="text-sm text-muted-foreground">Bottles</p>
                    <p className="mt-2 text-2xl font-semibold">{bottleCount}</p>
                  </div>
                  <div className="rounded-3xl bg-secondary/60 p-4">
                    <p className="text-sm text-muted-foreground">Temp</p>
                    <p className="mt-2 text-2xl font-semibold">{location.temperatureC}C</p>
                  </div>
                  <div className="rounded-3xl bg-secondary/60 p-4">
                    <p className="text-sm text-muted-foreground">Humidity</p>
                    <p className="mt-2 text-2xl font-semibold">{location.humidity}%</p>
                  </div>
                </div>

                <div className="rounded-3xl border border-border/70 bg-background/70 p-4">
                  <p className="text-sm font-medium">Why this zone exists</p>
                  <p className="mt-2 text-sm text-muted-foreground">{location.notes}</p>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium">Mapped bottles</p>
                  {locationWines.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-border/70 bg-background/50 p-4 text-sm text-muted-foreground">
                      No wines currently assigned to this location.
                    </div>
                  ) : (
                    locationWines.map((wine) => (
                      <div key={wine.id} className="flex items-start justify-between gap-3 rounded-3xl border border-border/70 bg-background/70 p-4">
                        <div>
                          <p className="font-semibold">
                            {getWineDisplayTitle(wine)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {[wine.vintage ? String(wine.vintage) : "", formatWinePlacement(wine.shelf, wine.slot), `Qty ${wine.quantity}`]
                              .filter(Boolean)
                              .join(" • ")}
                          </p>
                        </div>
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{wine.readiness}</span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
