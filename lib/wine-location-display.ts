export function formatWinePlacement(shelf?: string | null, slot?: string | null) {
  const cleanShelf = shelf?.trim() ?? "";
  const cleanSlot = slot?.trim() ?? "";

  if (cleanShelf && cleanSlot) {
    return `Shelf ${cleanShelf} / Slot ${cleanSlot}`;
  }

  if (cleanShelf) {
    return `Shelf ${cleanShelf}`;
  }

  if (cleanSlot) {
    return `Slot ${cleanSlot}`;
  }

  return "";
}
