/**
 * Returns a high-quality, plant-based food image URL matching the recipe title and category.
 */
export function getMatchingFoodImage(title: string, category?: string, isVegan = true): string {
  const t = `${title || ""} ${category || ""}`.toLowerCase();

  // Wellington / Braten / Blätterteig
  if (t.includes("wellington") || t.includes("blätterteig") || t.includes("braten") || t.includes("festbraten")) {
    return "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80";
  }
  // Desserts / Pistazie / Knafeh / Baklava / Schoko
  if (t.includes("pistazie") || t.includes("knafeh") || t.includes("kadaifi") || t.includes("dessert") || t.includes("schoko") || t.includes("torte") || t.includes("kuchen") || t.includes("süßspeise")) {
    return "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=80";
  }
  // Enchiladas / Burritos / Tacos / Quesadillas / Mexican
  if (t.includes("enchilada") || t.includes("taco") || t.includes("burrito") || t.includes("fajita") || t.includes("quesadilla") || t.includes("tortilla")) {
    return "https://images.unsplash.com/photo-1534352956036-cd81e27dd615?auto=format&fit=crop&w=1200&q=80";
  }
  // Mac & Cheese / Käsespätzle / Auflauf
  if (t.includes("mac and cheese") || t.includes("mac & cheese") || t.includes("makkaroni") || t.includes("spätzle") || t.includes("käsespätzle") || t.includes("gratin")) {
    return "https://images.unsplash.com/photo-1546549032-9571cd6b27df?auto=format&fit=crop&w=1200&q=80";
  }
  // Katsu Curry / Schnitzel / Crispy Tofu
  if (t.includes("katsu") || t.includes("schnitzel") || t.includes("paniert") || t.includes("crispy")) {
    return "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1200&q=80";
  }
  // Aubergine / Miso / Nasu Dengaku
  if (t.includes("aubergine") || t.includes("miso") || t.includes("nasu dengaku")) {
    return "https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=1200&q=80";
  }
  // Risotto / Pilze / Champignon / Kräuterseitling
  if (t.includes("risotto") || t.includes("pilz") || t.includes("champignon") || t.includes("steinpilz") || t.includes("seitling") || t.includes("medaillon")) {
    return "https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?auto=format&fit=crop&w=1200&q=80";
  }
  // Bolognese / Rote Tomatensauce / Lasagne
  if (t.includes("bolognese") || t.includes("tomatenpasta") || t.includes("lasagne") || t.includes("spaghetti") || t.includes("arrabbiata") || t.includes("linguine")) {
    return "https://images.unsplash.com/photo-1621996346565-e3d5d606771a?auto=format&fit=crop&w=1200&q=80";
  }
  // Grüne Pasta / Pesto / Basilikum
  if (t.includes("pesto") || (t.includes("pasta") && (t.includes("spinat") || t.includes("grün") || t.includes("cashew")))) {
    return "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=1200&q=80";
  }
  // Gnocchi
  if (t.includes("gnocchi")) {
    return "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=1200&q=80";
  }
  // Ramen / Wok / Asiatisch
  if (t.includes("ramen") || t.includes("dan dan") || t.includes("soba") || t.includes("udon") || t.includes("asia-nudel") || t.includes("glasnudel") || t.includes("wok")) {
    return "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=1200&q=80";
  }
  // Curry / Dal / Eintopf
  if (t.includes("curry") || t.includes("dal") || t.includes("dhal") || t.includes("tikka") || t.includes("korma") || t.includes("eintopf")) {
    return "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&w=1200&q=80";
  }
  // Sushi / Reishappen / Poke
  if (t.includes("sushi") || t.includes("tartar") || t.includes("onigiri") || t.includes("noriblatt")) {
    return "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1200&q=80";
  }
  // Shakshuka
  if (t.includes("shakshuka") || t.includes("schmorpfanne")) {
    return "https://images.unsplash.com/photo-1584947897554-0678d4615d86?auto=format&fit=crop&w=1200&q=80";
  }
  // Puffer / Bratlinge / Röstis
  if (t.includes("puffer") || t.includes("bratling") || t.includes("rösti") || t.includes("fritter")) {
    return "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=80";
  }
  // Bowls / Buddha Bowl
  if (t.includes("bowl") || t.includes("quinoa") || t.includes("buddha") || t.includes("edamame")) {
    return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80";
  }
  // Salat / Greens
  if (t.includes("salat") || t.includes("salad") || t.includes("greens") || t.includes("dressing") || t.includes("rohkost")) {
    return "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=80";
  }
  // Falafel / Hummus / Orient
  if (t.includes("falafel") || t.includes("hummus") || t.includes("tahini") || t.includes("orient") || t.includes("gyros") || t.includes("tzatziki")) {
    return "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80";
  }
  // Burger / Sandwich
  if (t.includes("burger") || t.includes("sandwich") || t.includes("patty") || t.includes("slider")) {
    return "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=80";
  }
  // Pizza / Flammkuchen
  if (t.includes("pizza") || t.includes("flammkuchen") || t.includes("focaccia") || t.includes("calzone")) {
    return "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=1200&q=80";
  }
  // Ofengerichte / Blechgemüse
  if (t.includes("ofen") || t.includes("blech") || t.includes("kartoffel") || t.includes("gemüse")) {
    return "https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=1200&q=80";
  }
  // Suppe / Eintopf
  if (t.includes("suppe") || t.includes("potage") || t.includes("cremesuppe") || t.includes("gazpacho") || t.includes("kürbis")) {
    return "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=1200&q=80";
  }
  // Frühstück / Oats / Pancakes
  if (t.includes("frühstück") || t.includes("pancake") || t.includes("waffel") || t.includes("hafer") || t.includes("oats") || t.includes("grieß") || t.includes("porridge") || t.includes("skyr")) {
    return "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=1200&q=80";
  }
  // Wraps / Sommerrollen
  if (t.includes("rolle") || t.includes("summer roll") || t.includes("frühlingsrolle") || t.includes("wrap")) {
    return "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=1200&q=80";
  }
  // Tofu / High Protein
  if (t.includes("tofu") || t.includes("tempeh") || t.includes("seitan") || t.includes("protein")) {
    return "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1200&q=80";
  }

  // Default clean plant-based dish
  return isVegan
    ? "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=80"
    : "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80";
}
