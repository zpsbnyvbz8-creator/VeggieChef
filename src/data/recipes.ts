import { Recipe } from '../types';

export const INITIAL_RECIPES: Recipe[] = [
  {
    id: 'rec-1',
    title: 'Kichererbsen-Kokos-Curry mit Spinat',
    subtitle: 'Schnelles, aromatisches Curry mit Kokosmilch und frischem Spinat',
    image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1200&q=80',
    category: 'Currys & Eintöpfe',
    isVegan: true,
    isVegetarian: true,
    prepTimeMinutes: 10,
    cookTimeMinutes: 15,
    totalTimeMinutes: 25,
    difficulty: 'Einfach',
    servings: 4,
    rating: 4.9,
    reviewCount: 142,
    season: 'Ganzjährig',
    nutrients: {
      calories: 460,
      protein: 21,
      carbs: 48,
      fat: 18,
      fiber: 11,
      iron: 5.4,
      zinc: 3.2,
      calcium: 120,
    },
    tags: ['Vegan', 'Unter 30 Min', 'High Protein', 'Glutenfrei', '1-Topf', 'Meal-Prep'],
    chefTip: 'Für extra Cremigkeit 2 EL Erdnussbutter oder Mandelmus in die Sauce einrühren!',
    ingredients: [
      { name: 'Kichererbsen (gegart)', amount: 480, unit: 'g', category: 'huelsenfruechte', isEssential: true },
      { name: 'Blattspinat (frisch oder TK)', amount: 200, unit: 'g', category: 'gemuese' },
      { name: 'Kokosmilch (cremig)', amount: 400, unit: 'ml', category: 'trockenwaren' },
      { name: 'Gehackte Tomaten', amount: 400, unit: 'g', category: 'trockenwaren' },
      { name: 'Zwiebel', amount: 1, unit: 'Stk', category: 'gemuese' },
      { name: 'Knoblauchzehen', amount: 2, unit: 'Stk', category: 'gemuese' },
      { name: 'Frischer Ingwer (gerieben)', amount: 1, unit: 'EL', category: 'gemuese' },
      { name: 'Garam Masala & Kurkuma', amount: 2, unit: 'TL', category: 'gewuerze' },
      { name: 'Kreuzkümmel (Kumin)', amount: 1, unit: 'TL', category: 'gewuerze' },
      { name: 'Kokosöl oder Rapsöl', amount: 1, unit: 'EL', category: 'trockenwaren' },
      { name: 'Limettensaft & Koriander', amount: 1, unit: 'EL', category: 'gewuerze' },
      { name: 'Salz & schwarzer Pfeffer', amount: 1, unit: 'TL', category: 'gewuerze' },
    ],
    steps: [
      {
            stepNumber: 1,
            title: 'Aromen anbraten',
            text: 'Zwiebel, Knoblauch und Ingwer fein hacken. Kokosöl in einer Pfanne erhitzen und die Mischung 2-3 Min. glasig dünsten.',
            timerMinutes: 3
      },
      {
            stepNumber: 2,
            title: 'Gewürze anrösten',
            text: 'Currypulver, gemahlenen Kreuzkümmel und Kurkuma hinzugeben und ca. 1 Min. unter Rühren sanft anrösten, bis es intensiv duftet.',
            timerMinutes: 1
      },
      {
            stepNumber: 3,
            title: 'Kichererbsen & Basis zugeben',
            text: 'Die Kichererbsen in ein Sieb abgießen, kurz abspülen und zusammen mit den gehackten Tomaten in die Pfanne geben.',
            timerMinutes: 2
      },
      {
            stepNumber: 4,
            title: 'Kokosmilch einrühren',
            text: 'Die cremige Kokosmilch unterrühren und das Curry auf mittlerer Stufe aufkochen lassen.',
            timerMinutes: 2
      },
      {
            stepNumber: 5,
            title: 'Einköcheln lassen',
            text: 'Das Curry bei reduzierter Hitze etwa 10-12 Minuten sanft köcheln lassen, bis die Sauce schön sämig wird.',
            timerMinutes: 12
      },
      {
            stepNumber: 6,
            title: 'Spinat & Frische',
            text: 'Den frischen Babyspinat portionsweise unterheben und kurz zusammenfallen lassen. Mit Limettensaft und Salz abschmecken.',
            timerMinutes: 2
      }
]
  },
  {
    id: 'rec-2',
    title: 'Ofen-Gnocchi mit Feta & Kirschtomaten',
    subtitle: 'Knusprig-cremiges Blechgericht ohne Vorkochen in nur 25 Minuten',
    image: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=1200&q=80',
    category: 'Ofengerichte',
    isVegan: false,
    isVegetarian: true,
    prepTimeMinutes: 5,
    cookTimeMinutes: 20,
    totalTimeMinutes: 25,
    difficulty: 'Einfach',
    servings: 3,
    rating: 4.95,
    reviewCount: 218,
    season: 'Sommer',
    nutrients: {
      calories: 520,
      protein: 19,
      carbs: 62,
      fat: 21,
      fiber: 6,
      calcium: 380,
      zinc: 2.1,
    },
    tags: ['Vegetarisch', 'Unter 30 Min', 'Blechgericht', 'Kinderliebling', 'Schnell'],
    chefTip: 'Die Gnocchi direkt ungekocht aufs Blech geben – so werden sie außen knusprig und innen herrlich fluffig!',
    veganVersionTips: 'Veganisiere dieses Gericht einfach mit einem veganen Bio-Feta-Block (z.B. auf Mandel- oder Kokosbasis) und einem Schuss Olivenöl.',
    ingredients: [
      { name: 'Frische Gnocchi (aus dem Kühlregal)', amount: 500, unit: 'g', category: 'kuehlregal', isEssential: true },
      { name: 'Feta (oder veganer Hirtenkäse)', amount: 200, unit: 'g', category: 'kuehlregal', veganAlternative: 'Veganer Block auf Mandel- oder Kokosbasis' },
      { name: 'Kirschtomaten', amount: 350, unit: 'g', category: 'gemuese' },
      { name: 'Kalamata-Oliven (entsteint)', amount: 60, unit: 'g', category: 'trockenwaren' },
      { name: 'Rote Zwiebel', amount: 1, unit: 'Stk', category: 'gemuese' },
      { name: 'Olivenöl extra vergine', amount: 3, unit: 'EL', category: 'trockenwaren' },
      { name: 'Frischer Oregano & Thymian', amount: 2, unit: 'Zweige', category: 'gewuerze' },
      { name: 'Frisches Basilikum', amount: 1, unit: 'Handvoll', category: 'gewuerze' },
      { name: 'Meersalz & Chiliflocken', amount: 1, unit: 'TL', category: 'gewuerze' },
    ],
    steps: [
      {
            stepNumber: 1,
            title: 'Ofen vorheizen',
            text: 'Den Backofen auf 200 °C Ober-/Unterhitze (180 °C Umluft) vorheizen und ein Backblech mit Backpapier auslegen.',
            timerMinutes: 5
      },
      {
            stepNumber: 2,
            title: 'Zutaten vorbereiten',
            text: 'Die Kirschtomaten waschen, Zwiebel schälen und in Spalten schneiden. Frischen Knoblauch andrücken.',
            timerMinutes: 3
      },
      {
            stepNumber: 3,
            title: 'Blech belegen',
            text: 'Ungekochte Gnocchi, Kirschtomaten, Zwiebelspalten und Oliven auf dem Blech verteilen. Den Feta-Block in die Mitte setzen.',
            timerMinutes: 2
      },
      {
            stepNumber: 4,
            title: 'Würzen & beträufeln',
            text: 'Alles großzügig mit Olivenöl beträufeln und mit Oregano, Meersalz und einer Prise Chiliflocken bestreuen.',
            timerMinutes: 2
      },
      {
            stepNumber: 5,
            title: 'Goldgelb backen',
            text: 'Das Blech für ca. 20-22 Minuten auf mittlerer Schiene backen, bis die Tomaten aufplatzen und die Gnocchi knusprig sind.',
            timerMinutes: 22
      },
      {
            stepNumber: 6,
            title: 'Mischen & Servieren',
            text: 'Das Blech aus dem Ofen nehmen. Den weichen Feta mit den Tomaten und Gnocchi direkt auf dem Blech vermengen und mit Basilikum bestreuen.'
      }
]
  },
  {
    id: 'rec-3',
    title: 'Tofu-Bowl mit Edamame, Quinoa & Erdnuss-Sauce',
    subtitle: 'Pflanzliche Protein-Bowl mit knackigem Gemüse und cremiger Erdnuss-Limetten-Sauce',
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=80',
    category: 'High Protein',
    isVegan: true,
    isVegetarian: true,
    prepTimeMinutes: 15,
    cookTimeMinutes: 15,
    totalTimeMinutes: 30,
    difficulty: 'Einfach',
    servings: 2,
    rating: 4.92,
    reviewCount: 95,
    season: 'Ganzjährig',
    nutrients: {
      calories: 580,
      protein: 34,
      carbs: 52,
      fat: 24,
      fiber: 13,
      iron: 6.8,
      zinc: 4.5,
      calcium: 210,
    },
    tags: ['Vegan', 'High Protein', 'Glutenfrei', 'Meal-Prep', 'Superfood'],
    chefTip: 'Tofu nach dem Würfeln mit 1 EL Speisestärke bestäuben – so wird er in der Pfanne ultracrispy!',
    ingredients: [
      { name: 'Räuchertofu oder Naturtofu', amount: 350, unit: 'g', category: 'kuehlregal', isEssential: true },
      { name: 'Quinoa (roh)', amount: 120, unit: 'g', category: 'trockenwaren' },
      { name: 'Edamame (TK, geschält)', amount: 150, unit: 'g', category: 'kuehlregal' },
      { name: 'Gurke & Karotte', amount: 1, unit: 'Stk', category: 'gemuese' },
      { name: 'Rotkohl (fein gehobelt)', amount: 100, unit: 'g', category: 'gemuese' },
      { name: 'Erdnussmus (cremig)', amount: 3, unit: 'EL', category: 'trockenwaren' },
      { name: 'Sojasauce (Tamari für GF)', amount: 2, unit: 'EL', category: 'trockenwaren' },
      { name: 'Ahornsirup oder Agavendicksaft', amount: 1, unit: 'TL', category: 'trockenwaren' },
      { name: 'Limetten (Saft)', amount: 1, unit: 'Stk', category: 'gemuese' },
      { name: 'Sesamöl & Speisestärke', amount: 1, unit: 'EL', category: 'trockenwaren' },
      { name: 'Gerösteter Sesam', amount: 1, unit: 'EL', category: 'gewuerze' },
    ],
    steps: [
      {
            stepNumber: 1,
            title: 'Quinoa kochen',
            text: 'Quinoa in einem feinen Sieb heiß abspülen. Mit 240 ml Wasser und einer Prise Salz aufkochen und bei geringer Hitze 12 Min. sanft quellen lassen.',
            timerMinutes: 12
      },
      {
            stepNumber: 2,
            title: 'Gemüse schneiden',
            text: 'Karotte und Gurke in feine Stifte schneiden, Rotkohl fein hobeln. Edamame kurz mit heißem Wasser überbrühen.',
            timerMinutes: 5
      },
      {
            stepNumber: 3,
            title: 'Tofu marinieren',
            text: 'Tofu trocken tupfen, in mundgerechte Würfel schneiden und mit Speisestärke und etwas Sojasauce vermengen.',
            timerMinutes: 3
      },
      {
            stepNumber: 4,
            title: 'Tofu knusprig braten',
            text: 'Sesamöl in einer Pfanne erhitzen und die Tofuwürfel darin ca. 8 Min. rundherum goldbraun und kross anbraten.',
            timerMinutes: 8
      },
      {
            stepNumber: 5,
            title: 'Erdnuss-Sauce rühren',
            text: 'Erdnussmus mit Sojasauce, Limettensaft, Ahornsirup und 3-4 EL warmem Wasser cremig verrühren.',
            timerMinutes: 2
      },
      {
            stepNumber: 6,
            title: 'Bowl anrichten',
            text: 'Quinoa in Schalen verteilen, Tofu, Edamame und Gemüse dekorativ anrichten, mit Erdnuss-Sauce beträufeln und Sesam bestreuen.'
      }
]
  },
  {
    id: 'rec-4',
    title: 'Shakshuka mit Feta & frischen Kräutern',
    subtitle: 'Würzige Pfanne aus pochierten Eiern, geschmorten Paprika & Tomaten-Kumin-Sauce',
    image: 'https://images.unsplash.com/photo-1590412200988-a436970781fa?auto=format&fit=crop&w=1200&q=80',
    category: 'Schnelle Feierabendküche',
    isVegan: false,
    isVegetarian: true,
    prepTimeMinutes: 10,
    cookTimeMinutes: 20,
    totalTimeMinutes: 30,
    difficulty: 'Einfach',
    servings: 2,
    rating: 4.88,
    reviewCount: 164,
    season: 'Ganzjährig',
    nutrients: {
      calories: 390,
      protein: 23,
      carbs: 22,
      fat: 22,
      fiber: 7,
      iron: 4.2,
      calcium: 190,
    },
    tags: ['Vegetarisch', 'Low Carb', 'High Protein', '1-Topf', 'Frühstück & Dinner'],
    chefTip: 'Mit warmem Pita-Brot oder knusprigem Sauerteigbrot servieren und direkt aus der Pfanne dippen!',
    veganVersionTips: 'Veganisiere Shakshuka mit Seidentofu-Nocken oder Kichererbsen anstelle der Eier.',
    ingredients: [
      { name: 'Bio-Eier', amount: 4, unit: 'Stk', category: 'kuehlregal', veganAlternative: '400g Kichererbsen oder 200g Tofublöckchen' },
      { name: 'Rote Paprika', amount: 2, unit: 'Stk', category: 'gemuese' },
      { name: 'Gehackte Tomaten (Dose)', amount: 400, unit: 'g', category: 'trockenwaren' },
      { name: 'Feta', amount: 80, unit: 'g', category: 'kuehlregal', veganAlternative: 'Veganer Feta oder Hefeflocken' },
      { name: 'Zwiebel & Knoblauch', amount: 2, unit: 'Stk', category: 'gemuese' },
      { name: 'Kreuzkümmel & Paprikapulver edelsüß', amount: 2, unit: 'TL', category: 'gewuerze' },
      { name: 'Chiliflocken & Koriander / Petersilie', amount: 1, unit: 'Bund', category: 'gewuerze' },
      { name: 'Olivenöl', amount: 2, unit: 'EL', category: 'trockenwaren' },
    ],
    steps: [
      {
            stepNumber: 1,
            title: 'Gemüse vorbereiten',
            text: 'Zwiebel, Knoblauch und bunte Paprika in dünne Streifen bzw. feine Würfel schneiden.',
            timerMinutes: 4
      },
      {
            stepNumber: 2,
            title: 'Gemüse anschwitzen',
            text: 'Olivenöl in einer großen Pfanne erhitzen. Zwiebeln und Paprika ca. 6 Min. sanft anbraten, bis sie weich werden.',
            timerMinutes: 6
      },
      {
            stepNumber: 3,
            title: 'Würzen & Aromatisieren',
            text: 'Knoblauch, Tomatenmark, Kreuzkümmel, Paprikapulver und eine Prise Chili zugeben und 1 Min. mitrösten.',
            timerMinutes: 1
      },
      {
            stepNumber: 4,
            title: 'Sauce einkochen',
            text: 'Stückige Tomaten zugießen, mit Salz und Pfeffer würzen und die Sauce bei mittlerer Hitze ca. 8 Min. sämig einkochen.',
            timerMinutes: 8
      },
      {
            stepNumber: 5,
            title: 'Eier pochieren',
            text: 'Mit einem Löffel kleine Mulden in die Sauce drücken, die Eier vorsichtig hineinschlagen und Feta darüber krümeln. Zugedeckt 6-8 Min. stocken lassen.',
            timerMinutes: 7
      },
      {
            stepNumber: 6,
            title: 'Kräuter & Servieren',
            text: 'Pfanne vom Herd nehmen, mit frischer Petersilie und Koriander bestreuen und direkt warm mit Fladenbrot servieren.'
      }
]
  },
  {
    id: 'rec-5',
    title: 'One-Pot Linsen-Bolognese mit Vollkorn-Pasta',
    subtitle: 'Herzhafter Klassiker mit braunen Berglinsen, Wurzelgemüse und Tomatensauce',
    image: 'https://images.unsplash.com/photo-1598866594230-a7c12756260f?auto=format&fit=crop&w=1200&q=80',
    category: 'Pasta & Gnocchi',
    isVegan: true,
    isVegetarian: true,
    prepTimeMinutes: 10,
    cookTimeMinutes: 20,
    totalTimeMinutes: 30,
    difficulty: 'Einfach',
    servings: 4,
    rating: 4.96,
    reviewCount: 290,
    season: 'Herbst',
    nutrients: {
      calories: 510,
      protein: 26,
      carbs: 78,
      fat: 9,
      fiber: 16,
      iron: 7.1,
      zinc: 3.8,
      calcium: 95,
    },
    tags: ['Vegan', '1-Topf', 'High Protein', 'Ballaststoffreich', 'Meal-Prep'],
    chefTip: '1 TL getrockneter Oregano und 1 TL Sojasauce verleihen der Sauce tiefe Umami-Würze!',
    ingredients: [
      { name: 'Vollkorn-Spaghetti oder Penne', amount: 400, unit: 'g', category: 'trockenwaren', isEssential: true },
      { name: 'Braune Berglinsen (oder Tellerlinsen)', amount: 200, unit: 'g', category: 'huelsenfruechte', isEssential: true },
      { name: 'Passierte Tomaten & Stückige Tomaten', amount: 800, unit: 'g', category: 'trockenwaren' },
      { name: 'Karotten (fein gewürfelt)', amount: 2, unit: 'Stk', category: 'gemuese' },
      { name: 'Stangensellerie', amount: 2, unit: 'Stangen', category: 'gemuese' },
      { name: 'Zwiebel & Knoblauchzehen', amount: 3, unit: 'Stk', category: 'gemuese' },
      { name: 'Tomatenmark', amount: 2, unit: 'EL', category: 'trockenwaren' },
      { name: 'Gemüsebrühe', amount: 500, unit: 'ml', category: 'trockenwaren' },
      { name: 'Italienische Kräuter & Balsamico', amount: 2, unit: 'EL', category: 'gewuerze' },
      { name: 'Olivenöl', amount: 2, unit: 'EL', category: 'trockenwaren' },
      { name: 'Hefeflocken (als Parmesan-Ersatz)', amount: 3, unit: 'EL', category: 'trockenwaren' },
    ],
    steps: [
      {
            stepNumber: 1,
            title: 'Gemüse hacken',
            text: 'Karotte, Sellerie, Zwiebel und Knoblauch fein würfeln (klassisches Soffritto).',
            timerMinutes: 5
      },
      {
            stepNumber: 2,
            title: 'Soffritto anrösten',
            text: 'Olivenöl in einem großen Topf erhitzen und das gewürfelte Gemüse darin ca. 5 Min. anschwitzen.',
            timerMinutes: 5
      },
      {
            stepNumber: 3,
            title: 'Tomatenmark anrösten',
            text: 'Tomatenmark und getrockneten Oregano zugeben und 1-2 Min. unter Rühren leicht karamellisieren lassen.',
            timerMinutes: 2
      },
      {
            stepNumber: 4,
            title: 'Linsen & Brühe zugeben',
            text: 'Abgespülte Berglinsen, stückige Tomaten und Gemüsebrühe einrühren. Mit Salz und Pfeffer würzen.',
            timerMinutes: 2
      },
      {
            stepNumber: 5,
            title: 'Linsen garen',
            text: 'Alles abgedeckt bei mittlerer Hitze 20-25 Min. köcheln lassen, bis die Linsen schön weich und sämig sind.',
            timerMinutes: 22
      },
      {
            stepNumber: 6,
            title: 'Pasta & Vollenden',
            text: 'Die gekochte Vollkornpasta unter die Bolognese schwenken, kurz durchziehen lassen und mit Hefeflocken oder Parmesan servieren.'
      }
]
  },
  {
    id: 'rec-6',
    title: 'Mango-Avocado Summer Rolls mit Erdnuss-Dip',
    subtitle: 'Frische, leichte Reispapierrollen gefüllt mit Minze, Tofu und reifer Mango',
    image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=1200&q=80',
    category: 'Snacks & Dips',
    isVegan: true,
    isVegetarian: true,
    prepTimeMinutes: 25,
    cookTimeMinutes: 5,
    totalTimeMinutes: 30,
    difficulty: 'Mittel',
    servings: 2,
    rating: 4.91,
    reviewCount: 88,
    season: 'Sommer',
    nutrients: {
      calories: 440,
      protein: 17,
      carbs: 49,
      fat: 20,
      fiber: 9,
      iron: 3.8,
      calcium: 110,
    },
    tags: ['Vegan', 'Glutenfrei', 'Kalorienarm', 'Sommergericht', 'Frisch'],
    chefTip: 'Das Reispapier nur ca. 5 Sekunden in lauwarmes Wasser tauchen – es weicht beim Belegen noch nach!',
    ingredients: [
      { name: 'Reispapierblätter', amount: 8, unit: 'Stk', category: 'trockenwaren', isEssential: true },
      { name: 'Reife Mango & Avocado', amount: 2, unit: 'Stk', category: 'gemuese' },
      { name: 'Naturtofu (angebraten mit Sojasauce)', amount: 200, unit: 'g', category: 'kuehlregal' },
      { name: 'Reisnudeln (fein)', amount: 80, unit: 'g', category: 'trockenwaren' },
      { name: 'Gurke & Karotte (feine Streifen)', amount: 2, unit: 'Stk', category: 'gemuese' },
      { name: 'Frische Minze & Koriander', amount: 1, unit: 'Bund', category: 'gewuerze' },
      { name: 'Erdnussmus für den Dip', amount: 4, unit: 'EL', category: 'trockenwaren' },
      { name: 'Limetten & Hoisin-Sauce', amount: 2, unit: 'EL', category: 'trockenwaren' },
    ],
    steps: [
      {
            stepNumber: 1,
            title: 'Füllung vorbereiten',
            text: 'Mango, Avocado, Gurke und Tofu in gleichmäßige feine Streifen schneiden. Kräuter waschen.',
            timerMinutes: 8
      },
      {
            stepNumber: 2,
            title: 'Reisnudeln garen',
            text: 'Glasnudeln bzw. dünne Reisnudeln mit kochendem Wasser übergießen, 3 Min. ziehen lassen, kalt abschrecken.',
            timerMinutes: 3
      },
      {
            stepNumber: 3,
            title: 'Erdnuss-Dip mixen',
            text: 'Erdnussmus mit Sojasauce, Limettensaft, Ahornsirup und etwas warmem Wasser zu einem geschmeidigen Dip verrühren.',
            timerMinutes: 3
      },
      {
            stepNumber: 4,
            title: 'Reispapier einweichen',
            text: 'Ein Reispapierblatt ca. 15-20 Sekunden in warmes Wasser tauchen, bis es biegsam wird, und auf ein feuchtes Brett legen.',
            timerMinutes: 1
      },
      {
            stepNumber: 5,
            title: 'Summer Rolls wickeln',
            text: 'Im unteren Drittel Nudeln, Tofu, Mango, Avocado und Minzblätter auflegen. Die Seiten einklappen und von unten straff aufrollen.',
            timerMinutes: 5
      },
      {
            stepNumber: 6,
            title: 'Anrichten & Dippen',
            text: 'Die fertigen Rollen schräg halbieren und zusammen mit dem cremigen Erdnuss-Dip servieren.'
      }
]
  },
  {
    id: 'rec-7',
    title: 'Rote Linsen-Süßkartoffel-Suppe mit Kokos',
    subtitle: 'Samtige Suppe mit Kokosmilch, Ingwer und gerösteten Kürbiskernen',
    image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=1200&q=80',
    category: 'Currys & Eintöpfe',
    isVegan: true,
    isVegetarian: true,
    prepTimeMinutes: 10,
    cookTimeMinutes: 20,
    totalTimeMinutes: 30,
    difficulty: 'Einfach',
    servings: 4,
    rating: 4.87,
    reviewCount: 175,
    season: 'Winter',
    nutrients: {
      calories: 380,
      protein: 16,
      carbs: 52,
      fat: 12,
      fiber: 10,
      iron: 4.9,
      zinc: 2.7,
      calcium: 80,
    },
    tags: ['Vegan', 'Glutenfrei', '1-Topf', 'Unter 30 Min', 'Meal-Prep'],
    chefTip: 'Für Extra-Knusper die Kürbiskerne kurz in der Pfanne mit einer Prise Meersalz anrösten.',
    ingredients: [
      { name: 'Rote Linsen', amount: 200, unit: 'g', category: 'huelsenfruechte', isEssential: true },
      { name: 'Süßkartoffeln (gewürfelt)', amount: 400, unit: 'g', category: 'gemuese' },
      { name: 'Kokosmilch', amount: 300, unit: 'ml', category: 'trockenwaren' },
      { name: 'Gemüsebrühe', amount: 800, unit: 'ml', category: 'trockenwaren' },
      { name: 'Zwiebel & Ingwer (frisch)', amount: 2, unit: 'Stk', category: 'gemuese' },
      { name: 'Currypulver mild & Kumin', amount: 2, unit: 'TL', category: 'gewuerze' },
      { name: 'Limetten & geröstete Kürbiskerne', amount: 3, unit: 'EL', category: 'gewuerze' },
    ],
    steps: [
      {
            stepNumber: 1,
            title: 'Gemüse schneiden',
            text: 'Süßkartoffeln schälen und würfeln. Zwiebel, Knoblauch und frischen Ingwer fein hacken.',
            timerMinutes: 5
      },
      {
            stepNumber: 2,
            title: 'Aromen anschwitzen',
            text: 'Kokosöl in einem Suppentopf erhitzen, Zwiebel, Knoblauch und Ingwer darin 2 Min. andünsten.',
            timerMinutes: 2
      },
      {
            stepNumber: 3,
            title: 'Gewürze einrühren',
            text: 'Currypulver und Kurkuma kurz mitrösten, bis sich das volle Aroma entfaltet.',
            timerMinutes: 1
      },
      {
            stepNumber: 4,
            title: 'Linsen & Brühe kochen',
            text: 'Süßkartoffeln, rote Linsen und Gemüsebrühe zugeben. Aufkochen und ca. 15 Min. köcheln lassen, bis alles weich ist.',
            timerMinutes: 15
      },
      {
            stepNumber: 5,
            title: 'Kokosmilch & Pürieren',
            text: 'Kokosmilch zugießen und die Suppe mit einem Stabmixer samtig-cremig pürieren.',
            timerMinutes: 3
      },
      {
            stepNumber: 6,
            title: 'Abschmecken & Servieren',
            text: 'Mit Limettensaft, Salz und Pfeffer abschmecken und mit gerösteten Kürbiskernen garniert servieren.'
      }
]
  },
  {
    id: 'rec-8',
    title: 'Zucchini-Mais-Puffer mit Kräuterquark',
    subtitle: 'Goldbraun gebratene Gemüsepuffer mit Schnittlauch und frischem Kräuterquark',
    image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=1200&q=80',
    category: 'Schnelle Feierabendküche',
    isVegan: true,
    isVegetarian: true,
    prepTimeMinutes: 15,
    cookTimeMinutes: 15,
    totalTimeMinutes: 30,
    difficulty: 'Einfach',
    servings: 3,
    rating: 4.83,
    reviewCount: 64,
    season: 'Sommer',
    nutrients: {
      calories: 360,
      protein: 15,
      carbs: 42,
      fat: 14,
      fiber: 8,
      iron: 3.1,
      calcium: 130,
    },
    tags: ['Vegan', 'Unter 30 Min', 'Kinderliebling', 'Schnell', 'Snack'],
    chefTip: 'Geraspelte Zucchini mit Salz bestreuen und 5 Min. stehen lassen, dann kräftig ausdrücken für maximale Knusprigkeit!',
    ingredients: [
      { name: 'Zucchini (mittelgroß)', amount: 2, unit: 'Stk', category: 'gemuese', isEssential: true },
      { name: 'Mais (Dose, abgetropft)', amount: 150, unit: 'g', category: 'trockenwaren' },
      { name: 'Kichererbsenmehl (oder Dinkelmehl)', amount: 100, unit: 'g', category: 'trockenwaren' },
      { name: 'Hefeflocken & Backpulver', amount: 2, unit: 'EL', category: 'trockenwaren' },
      { name: 'Sojajoghurt ungesüßt (für Dip)', amount: 250, unit: 'g', category: 'kuehlregal' },
      { name: 'Frischer Schnittlauch & Knoblauch', amount: 1, unit: 'Bund', category: 'gewuerze' },
      { name: 'Bratöl & Meersalz', amount: 3, unit: 'EL', category: 'trockenwaren' },
    ],
    steps: [
      {
            stepNumber: 1,
            title: 'Zucchini raspeln',
            text: 'Zucchini grob raspeln, mit etwas Salz bestreuen und 5 Min. ziehen lassen.',
            timerMinutes: 5
      },
      {
            stepNumber: 2,
            title: 'Flüssigkeit ausdrücken',
            text: 'Die geraspelte Zucchini in einem sauberen Küchentuch kräftig ausdrücken, damit die Puffer knusprig werden.',
            timerMinutes: 3
      },
      {
            stepNumber: 3,
            title: 'Pufferteig anrühren',
            text: 'Ausgedrückte Zucchini, Mais, Kichererbsenmehl, Frühlingszwiebeln und Gewürze zu einer formbaren Masse verrühren.',
            timerMinutes: 3
      },
      {
            stepNumber: 4,
            title: 'Kräuterquark zubereiten',
            text: 'Quark (oder pflanzliche Alternative) mit gehacktem Schnittlauch, Zitronensaft, Salz und Pfeffer verrühren.',
            timerMinutes: 2
      },
      {
            stepNumber: 5,
            title: 'Puffer goldbraun braten',
            text: 'Öl in einer Pfanne erhitzen, Esslöffelportionen hineinsetzen, flach drücken und pro Seite ca. 4-5 Min. braten.',
            timerMinutes: 9
      },
      {
            stepNumber: 6,
            title: 'Warm servieren',
            text: 'Die heißen Knusperpuffer auf Tellern anrichten und mit dem Kräuterquark servieren.'
      }
]
  },
  {
    id: 'rec-9',
    title: 'Pilz-Risotto mit gerösteten Pinienkernen',
    subtitle: 'Schlotziges Arborio-Risotto mit braunen Champignons und frischer Petersilie',
    image: 'https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?auto=format&fit=crop&w=1200&q=80',
    category: 'Pasta & Gnocchi',
    isVegan: false,
    isVegetarian: true,
    prepTimeMinutes: 10,
    cookTimeMinutes: 25,
    totalTimeMinutes: 35,
    difficulty: 'Mittel',
    servings: 3,
    rating: 4.94,
    reviewCount: 130,
    season: 'Herbst',
    nutrients: {
      calories: 490,
      protein: 16,
      carbs: 68,
      fat: 18,
      fiber: 5,
      zinc: 2.9,
      calcium: 160,
    },
    tags: ['Vegetarisch', 'Gourmet', 'Glutenfrei', 'Date-Night'],
    chefTip: 'Den Risottoreis vor dem Ablöschen glasig anrösten und die heiße Gemüsebrühe nur kellenweise unter ständigem Rühren zufügen.',
    veganVersionTips: 'Verwende pflanzliche Butter und rühre zum Schluss 3 EL Hefeflocken oder veganen Parmesan ein.',
    ingredients: [
      { name: 'Risottoreis (Arborio oder Carnaroli)', amount: 250, unit: 'g', category: 'trockenwaren', isEssential: true },
      { name: 'Braune Champignons & Kräuterseitlinge', amount: 350, unit: 'g', category: 'gemuese', isEssential: true },
      { name: 'Heiße Gemüsebrühe', amount: 900, unit: 'ml', category: 'trockenwaren' },
      { name: 'Schalotte & Knoblauchzehe', amount: 2, unit: 'Stk', category: 'gemuese' },
      { name: 'Weißwein (trocken, alkoholfrei möglich)', amount: 100, unit: 'ml', category: 'trockenwaren' },
      { name: 'Parmesan (oder veganer Hartkäse)', amount: 60, unit: 'g', category: 'kuehlregal', veganAlternative: 'Veganer Reibekäse oder Hefeflocken' },
      { name: 'Butter', amount: 30, unit: 'g', category: 'kuehlregal', veganAlternative: 'Pflanzliche Bio-Butter' },
      { name: 'Pinienkerne & Trüffelöl', amount: 2, unit: 'EL', category: 'gewuerze' },
      { name: 'Frische Petersilie', amount: 1, unit: 'Bund', category: 'gewuerze' },
    ],
    steps: [
      {
            stepNumber: 1,
            title: 'Pilze vorbereiten',
            text: 'Champignons putzen und in Scheiben schneiden. Schalotte und Knoblauch fein würfeln.',
            timerMinutes: 4
      },
      {
            stepNumber: 2,
            title: 'Pilze scharf anbraten',
            text: 'Pilze in etwas Olivenöl 5 Min. kräftig anbraten, bis sie gebräunt sind. Anschließend beiseitestellen.',
            timerMinutes: 5
      },
      {
            stepNumber: 3,
            title: 'Reis anschwitzen',
            text: 'In demselben Topf Schalotten anschwitzen, Risottoreis zugeben und 1-2 Min. glasig dünsten.',
            timerMinutes: 2
      },
      {
            stepNumber: 4,
            title: 'Brühe schöpflöffelweise zugeben',
            text: 'Heiße Gemüsebrühe nach und nach zugeben und unter ständigem Rühren ca. 18-20 Min. garen.',
            timerMinutes: 18
      },
      {
            stepNumber: 5,
            title: 'Cremig vollenden',
            text: 'Gebratene Pilze, Butter (oder pflanzliche Butter) und geriebenen Parmesan/Hefeflocken unterrühren.',
            timerMinutes: 2
      },
      {
            stepNumber: 6,
            title: 'Pinienkerne & Servieren',
            text: 'Pinienkerne kurz fettfrei anrösten und mit frischer Petersilie über das fertige Risotto streuen.'
      }
]
  },
  {
    id: 'rec-10',
    title: 'Overnight Chia-Oats mit Beeren & Mandelmus',
    subtitle: 'Nährstoffreiches Frühstück mit Haferflocken, Chiasamen und frischen Beeren',
    image: 'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?auto=format&fit=crop&w=1200&q=80',
    category: 'Süßes & Frühstück',
    isVegan: true,
    isVegetarian: true,
    prepTimeMinutes: 5,
    cookTimeMinutes: 0,
    totalTimeMinutes: 5,
    difficulty: 'Einfach',
    servings: 2,
    rating: 4.89,
    reviewCount: 112,
    season: 'Ganzjährig',
    nutrients: {
      calories: 390,
      protein: 17,
      carbs: 48,
      fat: 14,
      fiber: 12,
      iron: 4.1,
      calcium: 260,
      b12: 1.2,
    },
    tags: ['Vegan', 'Unter 15 Min', 'Meal-Prep', 'High Fiber', 'Frühstück'],
    chefTip: 'Abends im Schraubglas vorbereiten – morgens einfach aus dem Kühlschrank nehmen und genießen!',
    ingredients: [
      { name: 'Zarte Haferflocken', amount: 100, unit: 'g', category: 'trockenwaren', isEssential: true },
      { name: 'Chiasamen', amount: 2, unit: 'EL', category: 'trockenwaren' },
      { name: 'Hafer- oder Mandelmilch', amount: 300, unit: 'ml', category: 'kuehlregal' },
      { name: 'Sojajoghurt (Vanille oder Natur)', amount: 150, unit: 'g', category: 'kuehlregal' },
      { name: 'TK-Waldbeeren (oder frische Beeren)', amount: 150, unit: 'g', category: 'kuehlregal' },
      { name: 'Mandelmus oder Erdnussmus', amount: 2, unit: 'EL', category: 'trockenwaren' },
      { name: 'Ahornsirup & Prise Zimt', amount: 1, unit: 'EL', category: 'gewuerze' },
    ],
    steps: [
      {
            stepNumber: 1,
            title: 'Trockene Zutaten wiegen',
            text: 'Zarte Haferflocken, Chiasamen und eine Prise Zimt in einer Schüssel oder im Glas vermengen.',
            timerMinutes: 2
      },
      {
            stepNumber: 2,
            title: 'Flüssigkeit einrühren',
            text: 'Pflanzendrink (z.B. Hafer- oder Mandelmilch) und Ahornsirup dazugeben und gründlich verrühren.',
            timerMinutes: 1
      },
      {
            stepNumber: 3,
            title: 'Quellen lassen',
            text: 'Nach 5 Minuten nochmals kurz umrühren, damit sich die Chiasamen gleichmäßig verteilen.',
            timerMinutes: 5
      },
      {
            stepNumber: 4,
            title: 'Über Nacht kühlen',
            text: 'Das Glas verschließen und für mindestens 4 Stunden oder über Nacht in den Kühlschrank stellen.',
            timerMinutes: 1
      },
      {
            stepNumber: 5,
            title: 'Beeren vorbereiten',
            text: 'Frische Beeren waschen oder Tiefkühlbeeren kurz in einem kleinen Topf sanft erwärmen.',
            timerMinutes: 2
      },
      {
            stepNumber: 6,
            title: 'Toppen & Genießen',
            text: 'Die cremigen Oats mit den Beeren, einem großen Löffel Mandelmus und gehackten Nüssen servieren.'
      }
]
  },
  {
    id: 'rec-11',
    title: 'Burrito-Bowl mit schwarzen Bohnen & Guacamole',
    subtitle: 'Bunte mexikanische Bowl mit gegrilltem Mais, Limetten-Reis und frischer Salsa',
    image: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&w=1200&q=80',
    category: 'Bowls & Salate',
    isVegan: true,
    isVegetarian: true,
    prepTimeMinutes: 15,
    cookTimeMinutes: 10,
    totalTimeMinutes: 25,
    difficulty: 'Einfach',
    servings: 2,
    rating: 4.93,
    reviewCount: 156,
    season: 'Ganzjährig',
    nutrients: {
      calories: 530,
      protein: 22,
      carbs: 69,
      fat: 19,
      fiber: 15,
      iron: 5.8,
      zinc: 3.1,
      calcium: 140,
    },
    tags: ['Vegan', 'Unter 30 Min', 'High Protein', 'Glutenfrei', 'Meal-Prep'],
    chefTip: 'Die schwarzen Bohnen mit etwas geräuchertem Paprikapulver (Pimentón de la Vera) und Kreuzkümmel anbraten!',
    ingredients: [
      { name: 'Schwarze Bohnen (Dose, abgespült)', amount: 400, unit: 'g', category: 'huelsenfruechte', isEssential: true },
      { name: 'Basmatireis oder Vollkornreis', amount: 150, unit: 'g', category: 'trockenwaren' },
      { name: 'Maiskörner', amount: 140, unit: 'g', category: 'trockenwaren' },
      { name: 'Avocado (reif)', amount: 1, unit: 'Stk', category: 'gemuese' },
      { name: 'Kirschtomaten & Rote Zwiebel', amount: 150, unit: 'g', category: 'gemuese' },
      { name: 'Romana-Salatherzen', amount: 1, unit: 'Stk', category: 'gemuese' },
      { name: 'Frischer Koriander & Limette', amount: 1, unit: 'Bund', category: 'gewuerze' },
      { name: 'Geräuchertes Paprikapulver & Kreuzkümmel', amount: 2, unit: 'TL', category: 'gewuerze' },
    ],
    steps: [
      {
            stepNumber: 1,
            title: 'Limetten-Reis kochen',
            text: 'Reis nach Packungsanleitung kochen, anschließend mit frischem Limettensaft und gehacktem Koriander verfeinern.',
            timerMinutes: 15
      },
      {
            stepNumber: 2,
            title: 'Schwarze Bohnen würzen',
            text: 'Bohnen abspülen, mit Kreuzkümmel, Knoblauch und geräuchertem Paprikapulver 5 Min. sanft erwärmen.',
            timerMinutes: 5
      },
      {
            stepNumber: 3,
            title: 'Mais anrösten',
            text: 'Maiskörner in einer trockenen Pfanne 3-4 Min. leicht anrösten, bis sie leichte Röststellen bekommen.',
            timerMinutes: 4
      },
      {
            stepNumber: 4,
            title: 'Guacamole anrühren',
            text: 'Avocado mit einer Gabel zerdrücken, mit Limettensaft, Salz, Pfeffer und Tomatenwürfeln vermengen.',
            timerMinutes: 3
      },
      {
            stepNumber: 5,
            title: 'Tomaten-Salsa schneiden',
            text: 'Kirschtomaten, rote Zwiebel und Koriander fein hacken und kurz ziehen lassen.',
            timerMinutes: 3
      },
      {
            stepNumber: 6,
            title: 'Bowl zusammenstellen',
            text: 'Reis als Basis in Schalen geben, Bohnen, Mais, Salsa und Guacamole daneben anrichten und servieren.'
      }
]
  },
  {
    id: 'rec-12',
    title: 'Pasta alla Vodka mit Cashewcreme',
    subtitle: 'Samtige Tomatencreme-Sauce mit cremigen Cashews und bissfester Pasta',
    image: 'https://images.unsplash.com/photo-1608897013039-887f21d8c804?auto=format&fit=crop&w=1200&q=80',
    category: 'Pasta & Gnocchi',
    isVegan: true,
    isVegetarian: true,
    prepTimeMinutes: 10,
    cookTimeMinutes: 15,
    totalTimeMinutes: 25,
    difficulty: 'Einfach',
    servings: 3,
    rating: 4.97,
    reviewCount: 310,
    season: 'Ganzjährig',
    nutrients: {
      calories: 540,
      protein: 18,
      carbs: 72,
      fat: 19,
      fiber: 7,
      iron: 4.8,
      calcium: 85,
    },
    tags: ['Vegan', 'Unter 30 Min', 'Gourmet', 'Viraler Hit', 'Pasta-Liebe'],
    chefTip: 'Für die Cashew-Creme ungesalzene Cashews 15 Min. in heißem Wasser einweichen und mit frischem Wasser seidig-glatt mixen.',
    ingredients: [
      { name: 'Rigatoni oder Penne', amount: 350, unit: 'g', category: 'trockenwaren', isEssential: true },
      { name: 'Cashewkerne (eingeweicht)', amount: 100, unit: 'g', category: 'trockenwaren', isEssential: true },
      { name: 'Tomatenmark (dreifach konzentriert)', amount: 100, unit: 'g', category: 'trockenwaren' },
      { name: 'Vodka (oder Gemüsebrühe mit Schuss Zitrone)', amount: 50, unit: 'ml', category: 'trockenwaren' },
      { name: 'Schalotten & Knoblauchzehen', amount: 3, unit: 'Stk', category: 'gemuese' },
      { name: 'Chiliflocken', amount: 1, unit: 'TL', category: 'gewuerze' },
      { name: 'Olivenöl', amount: 2, unit: 'EL', category: 'trockenwaren' },
      { name: 'Frisches Basilikum & Hefeflocken', amount: 1, unit: 'Bund', category: 'gewuerze' },
    ],
    steps: [
      {
            stepNumber: 1,
            title: 'Cashews einweichen & mixen',
            text: 'Cashewnüsse mit heißem Wasser überbrühen, 10 Min. ziehen lassen und mit frischem Wasser cremig pürieren.',
            timerMinutes: 10
      },
      {
            stepNumber: 2,
            title: 'Pasta aufsetzen',
            text: 'Einen großen Topf Salzwasser zum Kochen bringen und Pasta al dente kochen. Etwas Kochwasser aufbewahren.',
            timerMinutes: 10
      },
      {
            stepNumber: 3,
            title: 'Zwiebeln & Knoblauch dünsten',
            text: 'Schalotten und Knoblauch in Olivenöl sanft glasig dünsten.',
            timerMinutes: 3
      },
      {
            stepNumber: 4,
            title: 'Tomatenmark anrösten',
            text: 'Tomatenmark und Chiliflocken zugeben und 2 Min. anrösten. Mit einem Schuss Vodka ablöschen und verkochen lassen.',
            timerMinutes: 3
      },
      {
            stepNumber: 5,
            title: 'Cashewcreme unterrühren',
            text: 'Die Cashewcreme und etwas Nudelkochwasser einrühren, bis eine seidig glänzende rosa Sauce entsteht.',
            timerMinutes: 3
      },
      {
            stepNumber: 6,
            title: 'Mischen & Servieren',
            text: 'Die heiße Pasta direkt in die Sauce geben, gründlich vermengen und mit frischem Basilikum anrichten.'
      }
]
  },
  {
    id: 'rec-13',
    title: 'Gochujang-Pasta mit Räuchertofu',
    subtitle: 'Würzige Fusion-Pasta mit koreanischer Gochujang-Paste und knusprigem Räuchertofu',
    image: 'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?auto=format&fit=crop&w=1200&q=80',
    category: 'Pasta & Gnocchi',
    isVegan: true,
    isVegetarian: true,
    prepTimeMinutes: 10,
    cookTimeMinutes: 15,
    totalTimeMinutes: 25,
    difficulty: 'Einfach',
    servings: 2,
    rating: 4.98,
    reviewCount: 342,
    season: 'Ganzjährig',
    nutrients: {
      calories: 690,
      protein: 36,
      carbs: 76,
      fat: 26,
      fiber: 9,
      iron: 6.2,
      zinc: 4.1,
      calcium: 220,
    },
    tags: ['Vegan', 'High Protein', 'Viraler Hit', 'Unter 30 Min', 'Ersatzprodukt'],
    chefTip: 'Gochujang (fermentierte koreanische Chilipaste) erst im Öl anrösten – das vertieft das Umami und karamellisiert die milde Süße!',
    ingredients: [
      { name: 'Rigatoni oder Mezze Maniche', amount: 260, unit: 'g', category: 'trockenwaren', isEssential: true },
      { name: 'Räuchertofu (extra fest)', amount: 250, unit: 'g', category: 'kuehlregal', isEssential: true },
      { name: 'Gochujang-Paste (koreanisch)', amount: 2.5, unit: 'EL', category: 'gewuerze', isEssential: true },
      { name: 'Hafer-Kochcreme oder Soja-Cuisine', amount: 200, unit: 'ml', category: 'kuehlregal' },
      { name: 'Knoblauchzehen & Schalotten', amount: 3, unit: 'Stk', category: 'gemuese' },
      { name: 'Hefeflocken (für käsigen Umami-Schmelz)', amount: 3, unit: 'EL', category: 'trockenwaren' },
      { name: 'Ahornsirup', amount: 1, unit: 'TL', category: 'trockenwaren' },
      { name: 'Sesamöl & Olivenöl', amount: 2, unit: 'EL', category: 'trockenwaren' },
      { name: 'Frühlingszwiebeln & gerösteter Sesam', amount: 2, unit: 'Stk', category: 'gemuese' },
    ],
    steps: [
      {
            stepNumber: 1,
            title: 'Tofu vorbereiten',
            text: 'Räuchertofu in kleine Würfel schneiden und mit einem Küchenpapier gut trocken tupfen.',
            timerMinutes: 3
      },
      {
            stepNumber: 2,
            title: 'Tofu kross braten',
            text: 'Tofuwürfel in etwas Sesamöl bei mittlerer bis hoher Hitze 6-8 Min. knusprig ausbacken und beiseitestellen.',
            timerMinutes: 8
      },
      {
            stepNumber: 3,
            title: 'Pasta kochen',
            text: 'Pasta in reichlich Salzwasser al dente kochen. 1 Tasse Nudelkochwasser vor dem Abgießen abschöpfen.',
            timerMinutes: 10
      },
      {
            stepNumber: 4,
            title: 'Aromabasis anschwitzen',
            text: 'Knoblauch und Frühlingszwiebeln kurz in der Pfanne anbraten, Gochujang-Paste und Tomatenmark zugeben.',
            timerMinutes: 2
      },
      {
            stepNumber: 5,
            title: 'Sauce emulgieren',
            text: 'Pflanzliche Sahne (z.B. Soja oder Hafer) und etwas Nudelwasser einrühren, bis eine sämige Sauce entsteht.',
            timerMinutes: 3
      },
      {
            stepNumber: 6,
            title: 'Pasta vollenden',
            text: 'Die Nudeln und den krossen Räuchertofu in die Sauce geben, kurz durchschwenken und mit Frühlingszwiebeln bestreuen.'
      }
]
  },
  {
    id: 'rec-14',
    title: 'Seitan-Shawarma Bowl mit Tzatziki',
    subtitle: 'Würziger Seitan, knusprige Ofen-Süßkartoffeln und frisches Knoblauch-Tzatziki',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80',
    category: 'Bowls & Salate',
    isVegan: true,
    isVegetarian: true,
    prepTimeMinutes: 15,
    cookTimeMinutes: 20,
    totalTimeMinutes: 35,
    difficulty: 'Einfach',
    servings: 2,
    rating: 4.97,
    reviewCount: 220,
    season: 'Ganzjährig',
    nutrients: {
      calories: 780,
      protein: 48,
      carbs: 84,
      fat: 28,
      fiber: 16,
      iron: 8.4,
      zinc: 5.2,
      calcium: 240,
    },
    tags: ['Vegan', 'High Protein', 'Bulking / Kraft', 'Ersatzprodukt', 'Meal-Prep'],
    chefTip: 'Seitan vor dem Anbraten mit Shawarma-Gewürz (Kreuzkümmel, Koriander, Paprika, Zimt) und 1 EL Sojasauce marinieren – er saugt die Marinade wie ein Schwamm auf!',
    ingredients: [
      { name: 'Seitan-Filet oder veganes Kebab/Shawarma', amount: 320, unit: 'g', category: 'kuehlregal', isEssential: true },
      { name: 'Süßkartoffeln (in Wedges geschnitten)', amount: 400, unit: 'g', category: 'gemuese', isEssential: true },
      { name: 'Kichererbsen (Dose)', amount: 240, unit: 'g', category: 'huelsenfruechte' },
      { name: 'Sojajoghurt ungesüßt (griechische Art)', amount: 250, unit: 'g', category: 'kuehlregal' },
      { name: 'Salatgurke (geraspelt)', amount: 0.5, unit: 'Stk', category: 'gemuese' },
      { name: 'Kirschtomaten & rote Zwiebel', amount: 150, unit: 'g', category: 'gemuese' },
      { name: 'Knoblauchzehen & Zitronensaft', amount: 2, unit: 'Stk', category: 'gemuese' },
      { name: 'Shawarma-Gewürz & Kreuzkümmel', amount: 1.5, unit: 'EL', category: 'gewuerze' },
      { name: 'Olivenöl extra vergine', amount: 2.5, unit: 'EL', category: 'trockenwaren' },
      { name: 'Frische Minze oder Petersilie', amount: 1, unit: 'Handvoll', category: 'gewuerze' },
    ],
    steps: [
      {
            stepNumber: 1,
            title: 'Süßkartoffeln backen',
            text: 'Süßkartoffeln würfeln, mit Kichererbsen, Olivenöl und Kreuzkümmel mischen und bei 200 °C 20 Min. rösten.',
            timerMinutes: 20
      },
      {
            stepNumber: 2,
            title: 'Seitan marinieren',
            text: 'Seitanstreifen mit Shawarma-Gewürzmischung (Kreuzkümmel, Koriander, Paprika) und Olivenöl marinieren.',
            timerMinutes: 5
      },
      {
            stepNumber: 3,
            title: 'Tzatziki zubereiten',
            text: 'Gurke raspeln, ausdrücken und mit Soja-Skyr, Knoblauch, Olivenöl, Dill und Salz cremig verrühren.',
            timerMinutes: 4
      },
      {
            stepNumber: 4,
            title: 'Salat vorbereiten',
            text: 'Tomaten und Gurken würfeln, rote Zwiebel in feine Ringe schneiden und Petersilie hacken.',
            timerMinutes: 3
      },
      {
            stepNumber: 5,
            title: 'Seitan kross braten',
            text: 'Seitanstreifen in einer heißen Pfanne ca. 6-7 Min. kräftig und kross anbraten.',
            timerMinutes: 7
      },
      {
            stepNumber: 6,
            title: 'Bowl anrichten',
            text: 'Ofengemüse, krossen Seitan, frischen Salat und einen großen Klecks Tzatziki harmonisch in Bowls anrichten.'
      }
]
  },
  {
    id: 'rec-15',
    title: 'Smash Cheeseburger mit Pilz-Sauce & Schmorzwiebeln',
    subtitle: 'Saftige pflanzliche Patties, geschmolzener Käse und karamellisierte Zwiebeln',
    image: 'https://images.unsplash.com/photo-1525059696034-4967a8e1dca2?auto=format&fit=crop&w=1200&q=80',
    category: 'Schnelle Feierabendküche',
    isVegan: true,
    isVegetarian: true,
    prepTimeMinutes: 10,
    cookTimeMinutes: 10,
    totalTimeMinutes: 20,
    difficulty: 'Einfach',
    servings: 2,
    rating: 4.99,
    reviewCount: 412,
    season: 'Ganzjährig',
    nutrients: {
      calories: 760,
      protein: 42,
      carbs: 58,
      fat: 38,
      fiber: 8,
      iron: 7.2,
      zinc: 4.8,
      calcium: 190,
    },
    tags: ['Vegan', 'High Protein', 'Ersatzprodukt', 'Unter 30 Min', 'Comfort Food'],
    chefTip: 'Die Hackbällchen in der glühend heißen gusseisernen Pfanne mit einem Spatel hauchdünn platt drücken („smashen“) – das erzeugt die typische goldbraune Knusperkruste!',
    ingredients: [
      { name: 'Veganes Hack (auf Erbsenprotein-Basis z.B. Beyond)', amount: 350, unit: 'g', category: 'kuehlregal', isEssential: true },
      { name: 'Brioche Burger Buns (vegan)', amount: 2, unit: 'Stk', category: 'trockenwaren', isEssential: true },
      { name: 'Veganer Cheddar-Schmelzkäse (Scheiben)', amount: 4, unit: 'Scheiben', category: 'kuehlregal', isEssential: true },
      { name: 'Große Zwiebel (in Ringen)', amount: 1.5, unit: 'Stk', category: 'gemuese' },
      { name: 'Vegane Mayo', amount: 3, unit: 'EL', category: 'trockenwaren' },
      { name: 'Trüffelöl & Senf', amount: 1, unit: 'TL', category: 'gewuerze' },
      { name: 'Gewürzgurken (in Scheiben)', amount: 4, unit: 'Scheiben', category: 'trockenwaren' },
      { name: 'Pflanzliche Butter oder Rapsöl', amount: 2, unit: 'EL', category: 'trockenwaren' },
      { name: 'Salz & grober schwarzer Pfeffer', amount: 1, unit: 'TL', category: 'gewuerze' },
    ],
    steps: [
      {
            stepNumber: 1,
            title: 'Zwiebeln karamellisieren',
            text: 'Zwiebeln in feine Ringe schneiden und in einer Pfanne mit etwas Öl und einer Prise Zucker 12 Min. goldbraun schmoren.',
            timerMinutes: 12
      },
      {
            stepNumber: 2,
            title: 'Burger-Sauce anrühren',
            text: 'Pflanzliche Mayonnaise mit Senf, feingehackten Gewürzgurken und einer Prise Paprikapulver verrühren.',
            timerMinutes: 3
      },
      {
            stepNumber: 3,
            title: 'Buns anrösten',
            text: 'Die Burger-Brötchen halbieren und die Schnittflächen in der Pfanne kurz goldbraun anrösten.',
            timerMinutes: 2
      },
      {
            stepNumber: 4,
            title: 'Patties braten',
            text: 'Pflanzliche Patties in einer sehr heißen Gusseisenpfanne scharf anbraten und flach drücken.',
            timerMinutes: 4
      },
      {
            stepNumber: 5,
            title: 'Käse schmelzen',
            text: 'Vegane Käsescheiben auf die heißen Patties legen, einen Deckel aufsetzen und 1 Min. schmelzen lassen.',
            timerMinutes: 2
      },
      {
            stepNumber: 6,
            title: 'Burger zusammenbauen',
            text: 'Brötchen mit Sauce bestreichen, Salatblatt, Patty mit Schmelzkäse und Schmorzwiebeln auflegen und servieren.'
      }
]
  },
  {
    id: 'rec-16',
    title: 'Tofu in getrockneter Tomatensauce',
    subtitle: 'Knusprig gebratener Tofu in einer cremigen Sauce aus getrockneten Tomaten und Spinat',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80',
    category: 'High Protein',
    isVegan: true,
    isVegetarian: true,
    prepTimeMinutes: 10,
    cookTimeMinutes: 15,
    totalTimeMinutes: 25,
    difficulty: 'Einfach',
    servings: 2,
    rating: 4.96,
    reviewCount: 288,
    season: 'Ganzjährig',
    nutrients: {
      calories: 640,
      protein: 38,
      carbs: 42,
      fat: 34,
      fiber: 9,
      iron: 6.9,
      zinc: 4.4,
      calcium: 380,
    },
    tags: ['Vegan', 'High Protein', 'Viraler Hit', 'Unter 30 Min', 'Date-Night'],
    chefTip: 'Das aromatische Öl aus dem Glas der getrockneten Tomaten zum Anbraten des Knoblauchs nutzen – das gibt 10x mehr Geschmack!',
    ingredients: [
      { name: 'Naturtofu (extra fest, gepresst)', amount: 400, unit: 'g', category: 'kuehlregal', isEssential: true },
      { name: 'Getrocknete Tomaten in Öl (in Streifen)', amount: 80, unit: 'g', category: 'trockenwaren', isEssential: true },
      { name: 'Cashew-Sahne oder Hafer-Cuisine', amount: 250, unit: 'ml', category: 'kuehlregal', isEssential: true },
      { name: 'Speisestärke & Knoblauchpulver', amount: 1.5, unit: 'EL', category: 'trockenwaren' },
      { name: 'Knoblauchzehen (fein gehackt)', amount: 4, unit: 'Stk', category: 'gemuese' },
      { name: 'Gemüsebrühe (kräftig)', amount: 120, unit: 'ml', category: 'trockenwaren' },
      { name: 'Hefeflocken & getrockneter Oregano', amount: 2, unit: 'EL', category: 'gewuerze' },
      { name: 'Frischer Babyspinat', amount: 100, unit: 'g', category: 'gemuese' },
      { name: 'Frisches Basilikum & Chiliflocken', amount: 1, unit: 'Bund', category: 'gewuerze' },
    ],
    steps: [
      {
            stepNumber: 1,
            title: 'Tofu vorbereiten',
            text: 'Naturtofu trocken pressen, in Würfel schneiden und mit Speisestärke und Knoblauchpulver bestäuben.',
            timerMinutes: 3
      },
      {
            stepNumber: 2,
            title: 'Tofu kross braten',
            text: 'In Olivenöl von allen Seiten 8-10 Min. knusprig braten, herausnehmen und beiseitestellen.',
            timerMinutes: 10
      },
      {
            stepNumber: 3,
            title: 'Sauce ansetzen',
            text: 'Knoblauch und getrocknete Tomatenstreifen im Bratfett anschwitzen.',
            timerMinutes: 2
      },
      {
            stepNumber: 4,
            title: 'Ablöschen & binden',
            text: 'Gemüsebrühe und pflanzliche Kochcreme zugießen, Hefeflocken und italienische Kräuter einrühren.',
            timerMinutes: 3
      },
      {
            stepNumber: 5,
            title: 'Spinat zugeben',
            text: 'Die Sauce 3-4 Min. einköcheln lassen, dann Babyspinat unterrühren, bis er zusammenfällt.',
            timerMinutes: 4
      },
      {
            stepNumber: 6,
            title: 'Tofu vollenden',
            text: 'Den krossen Tofu zurück in die Sauce geben, kurz durchschwenken und mit Reis oder Pasta servieren.'
      }
]
  },
  {
    id: 'rec-17',
    title: 'Tikka Masala mit pflanzlichen Filetstreifen & Naan',
    subtitle: 'Pflanzliche Filetstreifen in cremiger, aromatischer Tikka-Currysauce',
    image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1200&q=80',
    category: 'Currys & Eintöpfe',
    isVegan: true,
    isVegetarian: true,
    prepTimeMinutes: 10,
    cookTimeMinutes: 15,
    totalTimeMinutes: 25,
    difficulty: 'Einfach',
    servings: 2,
    rating: 4.95,
    reviewCount: 198,
    season: 'Ganzjährig',
    nutrients: {
      calories: 720,
      protein: 46,
      carbs: 78,
      fat: 24,
      fiber: 11,
      iron: 7.8,
      zinc: 4.9,
      calcium: 180,
    },
    tags: ['Vegan', 'High Protein', 'Ersatzprodukt', 'Unter 30 Min', 'Meal-Prep'],
    chefTip: 'Vegane Hähnchenstücke erst scharf anbraten, damit sie Röststoffe bilden, und erst ganz am Schluss 2 Minuten in die Sauce geben – so bleiben sie super saftig!',
    ingredients: [
      { name: 'Vegane Chunks / Filetstreifen (z.B. LikeMeat oder Planted)', amount: 320, unit: 'g', category: 'kuehlregal', isEssential: true },
      { name: 'Gehackte Tomaten & Tomatenmark', amount: 400, unit: 'g', category: 'trockenwaren' },
      { name: 'Kokosmilch oder Cashewcreme', amount: 200, unit: 'ml', category: 'trockenwaren' },
      { name: 'Zwiebel, Knoblauch & frischer Ingwer', amount: 3, unit: 'Stk', category: 'gemuese' },
      { name: 'Garam Masala, Kreuzkümmel & Paprikapulver', amount: 2, unit: 'TL', category: 'gewuerze' },
      { name: 'Bockshornkleeblätter (Kasoori Methi, optional)', amount: 1, unit: 'TL', category: 'gewuerze' },
      { name: 'Basmatireis & veganes Knoblauch-Naan', amount: 180, unit: 'g', category: 'trockenwaren' },
      { name: 'Frischer Koriander & Limette', amount: 1, unit: 'Handvoll', category: 'gewuerze' },
      { name: 'Kokosöl oder Ghee-Alternative', amount: 2, unit: 'EL', category: 'trockenwaren' },
    ],
    steps: [
      {
            stepNumber: 1,
            title: 'Filetstreifen anbraten',
            text: 'Pflanzliche Filetspitzen in einer heißen Pfanne mit Öl rundherum 5 Min. anbraten und beiseitestellen.',
            timerMinutes: 5
      },
      {
            stepNumber: 2,
            title: 'Aromen anschwitzen',
            text: 'Zwiebel, Knoblauch und Ingwer fein reiben und in etwas Öl sanft andünsten.',
            timerMinutes: 3
      },
      {
            stepNumber: 3,
            title: 'Tikka-Gewürze anrösten',
            text: 'Garam Masala, Kumin, Koriander und Paprika zugeben und 1 Min. anrösten.',
            timerMinutes: 1
      },
      {
            stepNumber: 4,
            title: 'Sauce köcheln',
            text: 'Passierte Tomaten und Kokosmilch einrühren, 10 Min. sanft köcheln lassen.',
            timerMinutes: 10
      },
      {
            stepNumber: 5,
            title: 'Filetstreifen unterheben',
            text: 'Die angebratenen Streifen in die Currysauce geben und 4 Min. darin ziehen lassen.',
            timerMinutes: 4
      },
      {
            stepNumber: 6,
            title: 'Servieren',
            text: 'Mit frischem Koriander bestreuen und zusammen mit warmem Naan-Brot und Basmatireis anrichten.'
      }
]
  },
  {
    id: 'rec-18',
    title: 'Knusprige Reiskuchen mit scharfem Tofu-Tatar & Avocado',
    subtitle: 'Goldgelb gebratene Sushi-Reiswürfel mit pikant mariniertem Tofu und Avocado',
    image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1200&q=80',
    category: 'Snacks & Dips',
    isVegan: true,
    isVegetarian: true,
    prepTimeMinutes: 15,
    cookTimeMinutes: 15,
    totalTimeMinutes: 30,
    difficulty: 'Mittel',
    servings: 2,
    rating: 4.93,
    reviewCount: 165,
    season: 'Ganzjährig',
    nutrients: {
      calories: 560,
      protein: 28,
      carbs: 64,
      fat: 22,
      fiber: 7,
      iron: 4.5,
      zinc: 3.2,
      calcium: 150,
    },
    tags: ['Vegan', 'Viraler Hit', 'High Protein', 'Glutenfrei', 'Party-Hit'],
    chefTip: 'Den gekochten Sushireis fest in eine eckige Form pressen und 20 Min. ins Eisfach stellen – so lassen sich perfekte krosse Quadrate schneiden!',
    ingredients: [
      { name: 'Sushireis (gekocht mit Reisessig & Salz)', amount: 300, unit: 'g', category: 'trockenwaren', isEssential: true },
      { name: 'Naturtofu (sehr fein zerbröselt/gehackt)', amount: 250, unit: 'g', category: 'kuehlregal', isEssential: true },
      { name: 'Sriracha-Sauce & vegane Mayo', amount: 3, unit: 'EL', category: 'trockenwaren' },
      { name: 'Sesamöl & Sojasauce (Tamari)', amount: 2, unit: 'EL', category: 'trockenwaren' },
      { name: 'Reife Avocado (in feinen Scheiben)', amount: 1, unit: 'Stk', category: 'gemuese' },
      { name: 'Jalapeño (in dünnen Ringen)', amount: 1, unit: 'Stk', category: 'gemuese' },
      { name: 'Nori-Algenblatt (fein geschnitten) & Sesam', amount: 1, unit: 'EL', category: 'gewuerze' },
      { name: 'Bratöl zum Ausbacken', amount: 3, unit: 'EL', category: 'trockenwaren' },
    ],
    steps: [
      {
            stepNumber: 1,
            title: 'Sushireis kochen',
            text: 'Sushireis gründlich waschen, kochen und mit Reisessig, Zucker und Salz abschmecken.',
            timerMinutes: 18
      },
      {
            stepNumber: 2,
            title: 'Reiskuchen formen',
            text: 'Den Reis in eine flache Form pressen und mindestens 30 Min. im Kühlschrank fest werden lassen.',
            timerMinutes: 30
      },
      {
            stepNumber: 3,
            title: 'Würfel schneiden',
            text: 'Den kalten Reis in mundgerechte Quadrate schneiden.',
            timerMinutes: 3
      },
      {
            stepNumber: 4,
            title: 'Tofu-Tatar anrühren',
            text: 'Räuchertofu sehr fein hacken, mit veganer Sriracha-Mayo und Frühlingszwiebeln vermengen.',
            timerMinutes: 4
      },
      {
            stepNumber: 5,
            title: 'Reiswürfel braten',
            text: 'Reiswürfel in heißem Sesamöl von beiden Seiten ca. 4 Min. knusprig golden anbraten.',
            timerMinutes: 8
      },
      {
            stepNumber: 6,
            title: 'Belegen & Toppen',
            text: 'Knusprige Reiswürfel mit Avocadoscheiben und dem Tofu-Tatar belegen, mit Sesam bestreuen.'
      }
]
  },
  {
    id: 'rec-19',
    title: 'Gebratene Kräuterseitlinge auf Erbsenpüree',
    subtitle: 'Zart gebratene Pilzmedaillons auf feinem Erbsenpüree',
    image: 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=1200&q=80',
    category: 'Gourmet & Festlich',
    isVegan: true,
    isVegetarian: true,
    prepTimeMinutes: 15,
    cookTimeMinutes: 20,
    totalTimeMinutes: 35,
    difficulty: 'Anspruchsvoll',
    servings: 2,
    rating: 4.96,
    reviewCount: 84,
    season: 'Ganzjährig',
    nutrients: {
      calories: 510,
      protein: 24,
      carbs: 46,
      fat: 24,
      fiber: 14,
      iron: 6.1,
      zinc: 4.0,
      calcium: 130,
    },
    tags: ['Vegan', 'Gourmet', 'Date-Night', 'Glutenfrei', 'High Fiber'],
    chefTip: 'Die Stiele der Kräuterseitlinge in 2,5 cm dicke Taler schneiden und beide Schnittflächen rautenförmig 2 mm tief einritzen – so ziehen Butter und Knoblauch tief ein!',
    ingredients: [
      { name: 'Kräuterseitlinge (große dicke Stiele)', amount: 450, unit: 'g', category: 'gemuese', isEssential: true },
      { name: 'TK-Erbsen (süß & zart)', amount: 350, unit: 'g', category: 'gemuese', isEssential: true },
      { name: 'Vegane Blockbutter (auf Sheabasis)', amount: 40, unit: 'g', category: 'kuehlregal' },
      { name: 'Weißes Trüffelöl & frischer Zitronensaft', amount: 1, unit: 'TL', category: 'gewuerze' },
      { name: 'Frischer Knoblauch & Thymianzweige', amount: 3, unit: 'Stk', category: 'gemuese' },
      { name: 'Hafercreme oder Cashewcreme', amount: 80, unit: 'ml', category: 'kuehlregal' },
      { name: 'Weißwein oder Gemüsefond zum Ablöschen', amount: 60, unit: 'ml', category: 'trockenwaren' },
      { name: 'Fleur de Sel & Rosa Pfefferbeeren', amount: 1, unit: 'TL', category: 'gewuerze' },
    ],
    steps: [
      {
            stepNumber: 1,
            title: 'Erbsenpüree kochen',
            text: 'Erbsen in etwas Gemüsebrühe 4 Min. kochen, abgießen und mit Olivenöl, Minze und Salz fein pürieren.',
            timerMinutes: 5
      },
      {
            stepNumber: 2,
            title: 'Pilze vorbereiten',
            text: 'Stiele der Kräuterseitlinge in dicke Medaillons schneiden und kreuzweise leicht einritzen.',
            timerMinutes: 3
      },
      {
            stepNumber: 3,
            title: 'Pilze anbraten',
            text: 'Öl in einer Pfanne erhitzen, Pilzmedaillons von beiden Seiten 4-5 Min. goldbraun anbraten.',
            timerMinutes: 9
      },
      {
            stepNumber: 4,
            title: 'Aromatisieren',
            text: 'Pflanzliche Butter, Thymianzweige und angedrückten Knoblauch in die Pfanne geben und die Pilze damit übergießen.',
            timerMinutes: 2
      },
      {
            stepNumber: 5,
            title: 'Püree erwärmen',
            text: 'Das Erbsenpüree nochmals kurz erwärmen und mit etwas Zitronenabrieb abschmecken.',
            timerMinutes: 2
      },
      {
            stepNumber: 6,
            title: 'Anrichten',
            text: 'Erbsenpüree kreisförmig auf Tellern verstreichen, gebratene Pilzmedaillons daraufsetzen und servieren.'
      }
]
  },
  {
    id: 'rec-20',
    title: 'Seitan Wellington mit Pilz-Füllung & Rotweinjus',
    subtitle: 'Festlicher Seitanbraten im knusprigen Blätterteigmantel mit Schalotten-Jus',
    image: 'https://images.unsplash.com/photo-1608897013039-887f21d8c804?auto=format&fit=crop&w=1200&q=80',
    category: 'Gourmet & Festlich',
    isVegan: true,
    isVegetarian: true,
    prepTimeMinutes: 25,
    cookTimeMinutes: 40,
    totalTimeMinutes: 65,
    difficulty: 'Anspruchsvoll',
    servings: 4,
    rating: 4.99,
    reviewCount: 176,
    season: 'Winter',
    nutrients: {
      calories: 790,
      protein: 48,
      carbs: 68,
      fat: 36,
      fiber: 12,
      iron: 9.2,
      zinc: 6.4,
      calcium: 160,
    },
    tags: ['Vegan', 'Gourmet', 'High Protein', 'Festtagsessen', 'Ersatzprodukt'],
    chefTip: 'Die Pilz-Duxelles solange in der Pfanne rösten, bis absolut keine Flüssigkeit mehr austritt – so bleibt der Blätterteigboden von außen bis innen ultrablättrig und knusprig!',
    ingredients: [
      { name: 'Veganes Seitan-Filet / Bratenstück (vorgegart)', amount: 500, unit: 'g', category: 'kuehlregal', isEssential: true },
      { name: 'Vegane Blätterteigrolle (frisch gekühlt)', amount: 1, unit: 'Rolle', category: 'kuehlregal', isEssential: true },
      { name: 'Champignons & Steinpilze (feinst gehackt)', amount: 450, unit: 'g', category: 'gemuese', isEssential: true },
      { name: 'Gegarte Maronen (Vakuum, gehackt)', amount: 150, unit: 'g', category: 'trockenwaren' },
      { name: 'Schalotten & Knoblauch', amount: 3, unit: 'Stk', category: 'gemuese' },
      { name: 'Dijon-Senf zum Bestreichen', amount: 2, unit: 'EL', category: 'gewuerze' },
      { name: 'Kräftiger veganer Rotwein & Gemüsefond', amount: 300, unit: 'ml', category: 'trockenwaren' },
      { name: 'Frischer Rosmarin & Thymian', amount: 2, unit: 'Zweige', category: 'gewuerze' },
      { name: 'Sojamilch mit Prise Ahornsirup (zum Bestreichen)', amount: 2, unit: 'EL', category: 'kuehlregal' },
    ],
    steps: [
      {
            stepNumber: 1,
            title: 'Pilz-Füllung zubereiten',
            text: 'Waldpilze sehr fein hacken und mit Schalotten in einer Pfanne ohne Öl braten, bis alle Flüssigkeit verdampft ist.',
            timerMinutes: 10
      },
      {
            stepNumber: 2,
            title: 'Seitanbraten anbraten',
            text: 'Den geformten Seitanbraten kurz rundherum in einer Pfanne mit Öl scharf anbraten und abkühlen lassen.',
            timerMinutes: 6
      },
      {
            stepNumber: 3,
            title: 'Blätterteig belegen',
            text: 'Blätterteig ausrollen, die Pilz-Duxelles gleichmäßig darauf verstreichen und den Seitanbraten mittig platzieren.',
            timerMinutes: 4
      },
      {
            stepNumber: 4,
            title: 'Einrollen & Verzieren',
            text: 'Den Blätterteig straff um den Braten rollen, Enden verschließen und die Oberfläche leicht einschneiden.',
            timerMinutes: 3
      },
      {
            stepNumber: 5,
            title: 'Goldbraun backen',
            text: 'Das Wellington bei 200 °C Ober-/Unterhitze ca. 25-30 Minuten im Ofen goldbraun backen.',
            timerMinutes: 28
      },
      {
            stepNumber: 6,
            title: 'Sauce & Servieren',
            text: 'Schalotten mit Rotwein und Gemüsebrühe sämig einkochen, mit kalter Pflanzenbutter binden und zum Wellington servieren.',
            timerMinutes: 8
      }
]
  },
  {
    id: 'rec-21',
    title: 'Pistazien-Schoko Bowl mit knusprigem Kadayif',
    subtitle: 'Knuspriges Engelshaar, samtige Pistaziencreme und zarte dunkle Schokolade',
    image: 'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?auto=format&fit=crop&w=1200&q=80',
    category: 'Süßes & Frühstück',
    isVegan: true,
    isVegetarian: true,
    prepTimeMinutes: 10,
    cookTimeMinutes: 5,
    totalTimeMinutes: 15,
    difficulty: 'Einfach',
    servings: 2,
    rating: 4.99,
    reviewCount: 520,
    season: 'Ganzjährig',
    nutrients: {
      calories: 680,
      protein: 36,
      carbs: 62,
      fat: 32,
      fiber: 10,
      iron: 5.8,
      zinc: 4.2,
      calcium: 290,
    },
    tags: ['Vegan', 'Viraler Hit', 'High Protein', 'Bulking / Kraft', 'Unter 15 Min'],
    chefTip: 'Das Kadayif (Engelshaar-Teigfäden) in 1 TL veganer Butter goldbraun rösten – der Kontrast zwischen knusprigem Teig und samtiger Pistazie ist unwiderstehlich!',
    ingredients: [
      { name: 'Sojajoghurt griechische Art (oder Skyr-Alternative)', amount: 400, unit: 'g', category: 'kuehlregal', isEssential: true },
      { name: 'Veganes Vanille- oder Schoko-Proteinpulver', amount: 40, unit: 'g', category: 'trockenwaren', isEssential: true },
      { name: '100% reines Pistazienmus (grün & ungesüßt)', amount: 4, unit: 'EL', category: 'trockenwaren', isEssential: true },
      { name: 'Kadayif-Teigfäden (Engelshaar, feingehackt)', amount: 50, unit: 'g', category: 'trockenwaren' },
      { name: 'Vegane Zartbitterschokolade (geschmolzen)', amount: 60, unit: 'g', category: 'trockenwaren' },
      { name: 'Pflanzliche Butter', amount: 1, unit: 'TL', category: 'kuehlregal' },
      { name: 'Gehackte Pistazienkerne', amount: 2, unit: 'EL', category: 'trockenwaren' },
      { name: 'Frische Himbeeren', amount: 100, unit: 'g', category: 'gemuese' },
    ],
    steps: [
      {
            stepNumber: 1,
            title: 'Kadayif anrösten',
            text: 'Kadayif-Teigfäden zerkleinern und in pflanzlicher Butter in einer Pfanne goldbraun anrösten.',
            timerMinutes: 6
      },
      {
            stepNumber: 2,
            title: 'Pistaziencreme mischen',
            text: 'Pistazienmus mit Ahornsirup und einer Prise Salz glattrühren.',
            timerMinutes: 2
      },
      {
            stepNumber: 3,
            title: 'Basiscreme anrühren',
            text: 'Pflanzlichen Skyr oder Joghurt mit Vanilleextrakt verrühren.',
            timerMinutes: 2
      },
      {
            stepNumber: 4,
            title: 'Schokolade schmelzen',
            text: 'Dunkle Schokolade mit etwas Kokosöl im Wasserbad sanft schmelzen.',
            timerMinutes: 4
      },
      {
            stepNumber: 5,
            title: 'Kadayif vermengen',
            text: 'Das geröstete Kadayif mit der Pistaziencreme gründlich vermengen.',
            timerMinutes: 2
      },
      {
            stepNumber: 6,
            title: 'Schichten & Servieren',
            text: 'Basiscreme in Schalen füllen, Pistazien-Crunch daraufgeben und mit der flüssigen Schokolade beträufeln.'
      }
]
  },
  {
    id: 'rec-22',
    title: 'Tex-Mex Enchiladas mit Bohnen-Gemüse-Füllung',
    subtitle: 'Gefüllte Maistortillas, überbacken mit saftiger Tomatensauce und Käse',
    image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=1200&q=80',
    category: 'Ofengerichte',
    isVegan: true,
    isVegetarian: true,
    prepTimeMinutes: 15,
    cookTimeMinutes: 20,
    totalTimeMinutes: 35,
    difficulty: 'Einfach',
    servings: 3,
    rating: 4.94,
    reviewCount: 167,
    season: 'Ganzjährig',
    nutrients: {
      calories: 810,
      protein: 46,
      carbs: 88,
      fat: 29,
      fiber: 18,
      iron: 8.9,
      zinc: 5.6,
      calcium: 320,
    },
    tags: ['Vegan', 'High Protein', 'Bulking / Kraft', 'Ersatzprodukt', 'Meal-Prep'],
    chefTip: 'Tortillas vor dem Füllen kurz 10 Sekunden in der Mikrowelle oder Pfanne erwärmen – so brechen sie beim Aufrollen nicht!',
    ingredients: [
      { name: 'Veganes Hack (auf Erbsenprotein-Basis)', amount: 350, unit: 'g', category: 'kuehlregal', isEssential: true },
      { name: 'Weizen- oder Mais-Tortillas (mittelgroß)', amount: 6, unit: 'Stk', category: 'trockenwaren', isEssential: true },
      { name: 'Schwarze Bohnen (Dose, abgetropft)', amount: 250, unit: 'g', category: 'huelsenfruechte' },
      { name: 'Maiskörner (abgetropft)', amount: 150, unit: 'g', category: 'trockenwaren' },
      { name: 'Passierte Tomaten & Tomatenmark', amount: 500, unit: 'g', category: 'trockenwaren' },
      { name: 'Veganer Reibekäse (gut schmelzend)', amount: 180, unit: 'g', category: 'kuehlregal', isEssential: true },
      { name: 'Zwiebel & Knoblauchzehen', amount: 2, unit: 'Stk', category: 'gemuese' },
      { name: 'Kreuzkümmel, geräucherte Paprika & Chili', amount: 2, unit: 'TL', category: 'gewuerze' },
      { name: 'Frischer Koriander & Limette', amount: 1, unit: 'Bund', category: 'gewuerze' },
    ],
    steps: [
      {
            stepNumber: 1,
            title: 'Füllung anbraten',
            text: 'Zwiebel, Knoblauch und Paprika würfeln und in Öl anbraten. Bohnen und Mais untermischen.',
            timerMinutes: 5
      },
      {
            stepNumber: 2,
            title: 'Würzen & binden',
            text: 'Kreuzkümmel, Oregano und etwas Tomatensauce unter die Füllung rühren und kurz köcheln lassen.',
            timerMinutes: 3
      },
      {
            stepNumber: 3,
            title: 'Enchilada-Sauce rühren',
            text: 'Passierte Tomaten mit Chilipulver, Knoblauchpulver und Salz zu einer sämigen Sauce verrühren.',
            timerMinutes: 2
      },
      {
            stepNumber: 4,
            title: 'Tortillas füllen & rollen',
            text: 'Die Maistortillas kurz erwärmen, mit der Bohnenmasse füllen, straff aufrollen und in eine Auflaufform legen.',
            timerMinutes: 5
      },
      {
            stepNumber: 5,
            title: 'Sauce & Käse darübergeben',
            text: 'Die Rollen mit der Tomatensauce bedecken und mit pflanzlichem Reibekäse bestreuen.',
            timerMinutes: 2
      },
      {
            stepNumber: 6,
            title: 'Überbacken',
            text: 'Im vorgeheizten Ofen bei 190 °C ca. 18-20 Minuten backen, bis der Käse geschmolzen ist.',
            timerMinutes: 20
      }
]
  },
  {
    id: 'rec-23',
    title: 'Mac and Cheese mit knusprigem Tempeh',
    subtitle: 'Cremige Cashew-Käsesauce über Makkaroni mit rauchigem Tempeh',
    image: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&w=1200&q=80',
    category: 'Pasta & Gnocchi',
    isVegan: true,
    isVegetarian: true,
    prepTimeMinutes: 10,
    cookTimeMinutes: 15,
    totalTimeMinutes: 25,
    difficulty: 'Einfach',
    servings: 2,
    rating: 4.96,
    reviewCount: 245,
    season: 'Ganzjährig',
    nutrients: {
      calories: 730,
      protein: 41,
      carbs: 82,
      fat: 27,
      fiber: 12,
      iron: 6.8,
      zinc: 4.8,
      calcium: 210,
    },
    tags: ['Vegan', 'High Protein', 'Bulking / Kraft', 'Comfort Food', 'Unter 30 Min'],
    chefTip: 'Ein kleiner Löffel Dijon-Senf und ein Hauch Apfelessig in der Cashew-Käsesauce simulieren die typische feine Schärfe von echtem gereiftem Cheddar!',
    ingredients: [
      { name: 'Makkaroni oder Penne', amount: 260, unit: 'g', category: 'trockenwaren', isEssential: true },
      { name: 'Tempeh (in hauchdünnen Streifen)', amount: 200, unit: 'g', category: 'kuehlregal', isEssential: true },
      { name: 'Cashewkerne (15 Min. eingeweicht)', amount: 90, unit: 'g', category: 'trockenwaren' },
      { name: 'Hefeflocken (Nährhefe)', amount: 4, unit: 'EL', category: 'trockenwaren', isEssential: true },
      { name: 'Karotte & Kartoffel (gekocht)', amount: 150, unit: 'g', category: 'gemuese' },
      { name: 'Knoblauch- & Zwiebelpulver', amount: 1.5, unit: 'TL', category: 'gewuerze' },
      { name: 'Räuchersalz (Liquid Smoke optional) & Sojasauce', amount: 1, unit: 'EL', category: 'gewuerze' },
      { name: 'Gedämpfte Brokkoliröschen (optional)', amount: 150, unit: 'g', category: 'gemuese' },
    ],
    steps: [
      {
            stepNumber: 1,
            title: 'Pasta kochen',
            text: 'Makkaroni in Salzwasser al dente kochen, abgießen und 1 Tasse Kochwasser auffangen.',
            timerMinutes: 9
      },
      {
            stepNumber: 2,
            title: 'Sauce vorbereiten',
            text: 'Kartoffeln, Karotten und Cashews kochen, bis das Gemüse weich ist.',
            timerMinutes: 10
      },
      {
            stepNumber: 3,
            title: 'Käsesauce mixen',
            text: 'Gekochtes Gemüse und Cashews mit Hefeflocken, Senf, Knoblauchpulver und Kochwasser samtig pürieren.',
            timerMinutes: 3
      },
      {
            stepNumber: 4,
            title: 'Tempeh marinieren & braten',
            text: 'Tempeh würfeln, mit Sojasauce und Räucherpaprika würzen und in Öl 6 Min. knusprig braten.',
            timerMinutes: 6
      },
      {
            stepNumber: 5,
            title: 'Pasta vermengen',
            text: 'Die gekochten Nudeln mit der cremigen Käsesauce gründlich vermengen.',
            timerMinutes: 2
      },
      {
            stepNumber: 6,
            title: 'Servieren',
            text: 'In Schalen anrichten und mit dem rauchigen Knusper-Tempeh und Schnittlauch toppen.'
      }
]
  },
  {
    id: 'rec-24',
    title: 'Dan Dan Nudeln mit Erdnuss-Sauce & Tofu',
    subtitle: 'Schnelle asiatische Nudeln mit Erdnussmus, Chiliöl, Tofu und Pak Choi',
    image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=1200&q=80',
    category: 'Schnelle Feierabendküche',
    isVegan: true,
    isVegetarian: true,
    prepTimeMinutes: 5,
    cookTimeMinutes: 10,
    totalTimeMinutes: 15,
    difficulty: 'Einfach',
    servings: 2,
    rating: 4.97,
    reviewCount: 310,
    season: 'Ganzjährig',
    nutrients: {
      calories: 670,
      protein: 34,
      carbs: 72,
      fat: 26,
      fiber: 9,
      iron: 6.4,
      zinc: 4.2,
      calcium: 190,
    },
    tags: ['Vegan', 'Unter 15 Min', 'High Protein', 'Express', 'Asiatisch'],
    chefTip: 'Chili-Crisp (Chiliöl mit Röstzwiebeln) sorgt für unverwechselbares Knuspern und authentisches Streetfood-Aroma!',
    ingredients: [
      { name: 'Asiatische Ramen- oder Udon-Nudeln', amount: 240, unit: 'g', category: 'trockenwaren', isEssential: true },
      { name: 'Naturtofu (mit Händen fein zerbröselt)', amount: 250, unit: 'g', category: 'kuehlregal', isEssential: true },
      { name: 'Cremiges Erdnussmus', amount: 3, unit: 'EL', category: 'trockenwaren', isEssential: true },
      { name: 'Dunkle Sojasauce & Reisessig', amount: 2, unit: 'EL', category: 'trockenwaren' },
      { name: 'Chili-Crisp oder Chiliöl mit Knoblauch', amount: 1.5, unit: 'EL', category: 'gewuerze' },
      { name: 'Frischer Ingwer & Knoblauch', amount: 2, unit: 'TL', category: 'gemuese' },
      { name: 'Pak Choi oder Babyspinat', amount: 150, unit: 'g', category: 'gemuese' },
      { name: 'Edamame (TK, geschält)', amount: 100, unit: 'g', category: 'kuehlregal' },
    ],
    steps: [
      {
            stepNumber: 1,
            title: 'Nudeln & Pak Choi kochen',
            text: 'Nudeln kochen und in den letzten 60 Sekunden den geviertelten Pak Choi mit ins Wasser geben.',
            timerMinutes: 5
      },
      {
            stepNumber: 2,
            title: 'Tofu zerbröseln',
            text: 'Tofu mit den Händen fein zerbröseln oder hacken.',
            timerMinutes: 2
      },
      {
            stepNumber: 3,
            title: 'Tofu knusprig anbraten',
            text: 'Den Tofu in einer Pfanne mit Sojasauce und Fünf-Gewürze-Pulver 6 Min. kräftig anbraten.',
            timerMinutes: 6
      },
      {
            stepNumber: 4,
            title: 'Dan-Dan Sauce rühren',
            text: 'Erdnussmus, Sojasauce, Reisessig, Knoblauch und Chiliöl mit 4 EL Nudelkochwasser glattrühren.',
            timerMinutes: 2
      },
      {
            stepNumber: 5,
            title: 'Mischen',
            text: 'Die Nudeln direkt in die Schüsseln mit der Sauce geben und gründlich durchmischen.',
            timerMinutes: 1
      },
      {
            stepNumber: 6,
            title: 'Toppen & Servieren',
            text: 'Den krossen Tofu und den gedämpften Pak Choi darauf anrichten und mit geröstetem Sesam servieren.'
      }
]
  },
  {
    id: 'rec-25',
    title: 'Katsu Curry mit knusprigem Seitan-Schnitzel & Reis',
    subtitle: 'Panko-paniertes Seitan-Schnitzel auf japanischer Currysauce mit Duftreis',
    image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=1200&q=80',
    category: 'Currys & Eintöpfe',
    isVegan: true,
    isVegetarian: true,
    prepTimeMinutes: 15,
    cookTimeMinutes: 15,
    totalTimeMinutes: 30,
    difficulty: 'Einfach',
    servings: 2,
    rating: 4.95,
    reviewCount: 189,
    season: 'Ganzjährig',
    nutrients: {
      calories: 740,
      protein: 38,
      carbs: 92,
      fat: 24,
      fiber: 11,
      iron: 7.9,
      zinc: 5.1,
      calcium: 140,
    },
    tags: ['Vegan', 'High Protein', 'Ersatzprodukt', 'Streetfood', 'Bulking / Kraft'],
    chefTip: 'Pankomehl (japanische grobe Semmelbrösel) saugt deutlich weniger Öl auf als normale Semmelbrösel und wird im Ofen oder in der Pfanne 3x knuspriger!',
    ingredients: [
      { name: 'Seitan-Schnitzel oder fester Tofu', amount: 280, unit: 'g', category: 'kuehlregal', isEssential: true },
      { name: 'Pankomehl (grobe japanische Brösel)', amount: 80, unit: 'g', category: 'trockenwaren', isEssential: true },
      { name: 'Japanisches Curry-Roux (oder Currypulver + Mehl)', amount: 2, unit: 'Würfel', category: 'trockenwaren' },
      { name: 'Karotten & Kartoffeln (gewürfelt)', amount: 250, unit: 'g', category: 'gemuese' },
      { name: 'Zwiebel & Apfel (fein gerieben)', amount: 1.5, unit: 'Stk', category: 'gemuese' },
      { name: 'Gemüsebrühe', amount: 500, unit: 'ml', category: 'trockenwaren' },
      { name: 'Jasminreis (gekocht)', amount: 200, unit: 'g', category: 'trockenwaren' },
      { name: 'Mehl & Sojamilch zum Panieren', amount: 3, unit: 'EL', category: 'trockenwaren' },
    ],
    steps: [
      {
            stepNumber: 1,
            title: 'Reis aufsetzen',
            text: 'Jasminreis gründlich waschen und mit Wasser und einer Prise Salz nach Packungsanleitung garen.',
            timerMinutes: 15
      },
      {
            stepNumber: 2,
            title: 'Currygemüse anbraten',
            text: 'Zwiebeln, Karotten und Kartoffeln würfeln und in Öl 4 Min. anbraten.',
            timerMinutes: 4
      },
      {
            stepNumber: 3,
            title: 'Currysauce köcheln',
            text: 'Japanische Curry-Roux (oder Currypulver und Mehl) und Brühe zugeben und 15 Min. köcheln lassen.',
            timerMinutes: 15
      },
      {
            stepNumber: 4,
            title: 'Seitan panieren',
            text: 'Seitanscheiben mehlieren, in Pflanzenmilch tauchen und in grobem Panko-Paniermehl wenden.',
            timerMinutes: 4
      },
      {
            stepNumber: 5,
            title: 'Katsu knusprig ausbacken',
            text: 'Das panierte Schnitzel in heißem Öl pro Seite ca. 3-4 Min. goldbraun frittieren oder braten.',
            timerMinutes: 8
      },
      {
            stepNumber: 6,
            title: 'Anrichten',
            text: 'Reis auf Teller geben, Currysauce danebengießen und das Katsu-Schnitzel in Streifen geschnitten darauflegen.'
      }
]
  },
  {
    id: 'rec-26',
    title: 'Baked Feta Pasta mit Mandel-Hirtenkäse',
    subtitle: 'Ofengebackener veganer Hirtenkäse mit geschmorten Kirschtomaten und Knoblauch',
    image: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=1200&q=80',
    category: 'Ofengerichte',
    isVegan: true,
    isVegetarian: true,
    prepTimeMinutes: 5,
    cookTimeMinutes: 20,
    totalTimeMinutes: 25,
    difficulty: 'Einfach',
    servings: 3,
    rating: 4.92,
    reviewCount: 380,
    season: 'Ganzjährig',
    nutrients: {
      calories: 630,
      protein: 26,
      carbs: 76,
      fat: 25,
      fiber: 8,
      iron: 5.5,
      zinc: 3.4,
      calcium: 260,
    },
    tags: ['Vegan', 'Viraler Hit', 'Blechgericht', 'Unter 30 Min', 'Ersatzprodukt'],
    chefTip: 'Den veganen Feta-Block vor dem Backen mit etwas Ahornsirup und Chiliflocken beträufeln – das balanciert die Säure perfekt!',
    ingredients: [
      { name: 'Veganer Hirtenkäse-Block (z.B. Bedda, Violife oder Simply V)', amount: 200, unit: 'g', category: 'kuehlregal', isEssential: true },
      { name: 'Kirschtomaten (süß & reif)', amount: 500, unit: 'g', category: 'gemuese', isEssential: true },
      { name: 'Kurze Pasta (z.B. Cavatappi oder Penne)', amount: 350, unit: 'g', category: 'trockenwaren', isEssential: true },
      { name: 'Knoblauchzehen (geschält)', amount: 5, unit: 'Stk', category: 'gemuese' },
      { name: 'Olivenöl extra vergine', amount: 3.5, unit: 'EL', category: 'trockenwaren' },
      { name: 'Hefeflocken für extra Umami', amount: 2, unit: 'EL', category: 'trockenwaren' },
      { name: 'Frisches Basilikum (großes Bund)', amount: 1, unit: 'Bund', category: 'gewuerze' },
      { name: 'Chiliflocken & Meersalz', amount: 1, unit: 'TL', category: 'gewuerze' },
    ],
    steps: [
      {
            stepNumber: 1,
            title: 'Form vorbereiten',
            text: 'Den Backofen auf 200 °C Ober-/Unterhitze vorheizen. Kirschtomaten in eine Auflaufform geben.',
            timerMinutes: 3
      },
      {
            stepNumber: 2,
            title: 'Hirtenkäse platzieren',
            text: 'Den Block pflanzlichen Hirtenkäse in die Mitte setzen, Knoblauchzehen halbieren und dazugeben.',
            timerMinutes: 2
      },
      {
            stepNumber: 3,
            title: 'Öl & Gewürze',
            text: 'Alles mit reichlich Olivenöl beträufeln und mit Oregano, Salz und Chiliflocken würzen.',
            timerMinutes: 2
      },
      {
            stepNumber: 4,
            title: 'Im Ofen backen',
            text: 'Für 25 Minuten backen, bis die Tomaten platzen und der Käse weich und cremig ist.',
            timerMinutes: 25
      },
      {
            stepNumber: 5,
            title: 'Pasta kochen',
            text: 'Inzwischen Nudeln al dente kochen und etwas Kochwasser abschöpfen.',
            timerMinutes: 10
      },
      {
            stepNumber: 6,
            title: 'Zerdrücken & Vermengen',
            text: 'Den heißen Käse mit Tomaten und Nudelwasser mit einer Gabel zerdrücken, Pasta unterheben und mit Basilikum servieren.'
      }
]
  },
  {
    id: 'rec-27',
    title: 'Grüne Pasta mit Spinat-Cashew-Pesto & Pinienkernen',
    subtitle: 'Cremig-grüne Pasta mit frischem Spinat, Cashewkernen und Pinienkernen',
    image: 'https://images.unsplash.com/photo-1608897013039-887f21d8c804?auto=format&fit=crop&w=1200&q=80',
    category: 'Pasta & Gnocchi',
    isVegan: true,
    isVegetarian: true,
    prepTimeMinutes: 8,
    cookTimeMinutes: 10,
    totalTimeMinutes: 18,
    difficulty: 'Einfach',
    servings: 2,
    rating: 4.94,
    reviewCount: 140,
    season: 'Frühling',
    nutrients: {
      calories: 650,
      protein: 30,
      carbs: 74,
      fat: 26,
      fiber: 11,
      iron: 7.4,
      zinc: 4.6,
      calcium: 210,
    },
    tags: ['Vegan', 'Viraler Hit', 'High Protein', 'Unter 20 Min', 'Superfood'],
    chefTip: 'Den frischen Spinat und das Basilikum im Mixer mit einem Eiswürfel pürieren – das hält die Farbe strahlend smaragdgrün!',
    ingredients: [
      { name: 'Vollkorn-Fettuccine oder Spaghetti', amount: 250, unit: 'g', category: 'trockenwaren', isEssential: true },
      { name: 'Babyblattspinat (frisch)', amount: 150, unit: 'g', category: 'gemuese', isEssential: true },
      { name: 'Cashewkerne (geröstet) oder Pinienkerne', amount: 60, unit: 'g', category: 'trockenwaren' },
      { name: 'Edamame (gegart)', amount: 140, unit: 'g', category: 'kuehlregal' },
      { name: 'Hefeflocken & frischer Zitronensaft', amount: 3, unit: 'EL', category: 'trockenwaren' },
      { name: 'Avocado (halb)', amount: 0.5, unit: 'Stk', category: 'gemuese' },
      { name: 'Knoblauch & Olivenöl', amount: 2, unit: 'EL', category: 'trockenwaren' },
      { name: 'Frisches Basilikum', amount: 1, unit: 'Bund', category: 'gewuerze' },
    ],
    steps: [
      {
            stepNumber: 1,
            title: 'Pasta kochen',
            text: 'Pasta in reichlich sprudelndem Salzwasser al dente kochen. 1 Tasse Nudelkochwasser sichern.',
            timerMinutes: 10
      },
      {
            stepNumber: 2,
            title: 'Zutaten für Pesto vorbereiten',
            text: 'Frischen Blattspinat waschen, Knoblauch schälen und Cashewkerne bereitlegen.',
            timerMinutes: 3
      },
      {
            stepNumber: 3,
            title: 'Pesto fein mixen',
            text: 'Spinat, Cashews, Knoblauch, Hefeflocken, Olivenöl und Zitronensaft in einem Mixer samtig pürieren.',
            timerMinutes: 3
      },
      {
            stepNumber: 4,
            title: 'Pinienkerne anrösten',
            text: 'Pinienkerne in einer kleinen Pfanne ohne Fett bei mittlerer Hitze 2-3 Min. goldbraun rösten.',
            timerMinutes: 3
      },
      {
            stepNumber: 5,
            title: 'Pasta mit Pesto vermengen',
            text: 'Das grüne Pesto mit etwas warmem Nudelwasser unter die heiße Pasta rühren, bis jede Nudel ummantelt ist.',
            timerMinutes: 2
      },
      {
            stepNumber: 6,
            title: 'Toppen & Servieren',
            text: 'Auf Tellern anrichten und mit den gerösteten Pinienkernen und frisch gemahlenem Pfeffer garnieren.'
      }
]
  },
  {
    id: 'rec-28',
    title: 'Miso-Auberginen auf Shiitake-Quinoa',
    subtitle: 'Zart schmelzende Auberginen mit weißem Miso-Glaze auf herzhaftem Quinoa',
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=80',
    category: 'Gourmet & Festlich',
    isVegan: true,
    isVegetarian: true,
    prepTimeMinutes: 10,
    cookTimeMinutes: 25,
    totalTimeMinutes: 35,
    difficulty: 'Mittel',
    servings: 2,
    rating: 4.93,
    reviewCount: 92,
    season: 'Ganzjährig',
    nutrients: {
      calories: 530,
      protein: 22,
      carbs: 65,
      fat: 20,
      fiber: 14,
      iron: 6.8,
      zinc: 4.3,
      calcium: 160,
    },
    tags: ['Vegan', 'Gourmet', 'Glutenfrei', 'High Fiber', 'Japanisch'],
    chefTip: 'Unter dem Ofengrill die letzte 3 Minuten genau beobachten – die Miso-Kruste soll herrlich karamellisieren und Blasen werfen, aber nicht verbrennen!',
    ingredients: [
      { name: 'Auberginen (groß & fest)', amount: 2, unit: 'Stk', category: 'gemuese', isEssential: true },
      { name: 'Shiro Miso (helle, milde Sojapaste)', amount: 3, unit: 'EL', category: 'gewuerze', isEssential: true },
      { name: 'Mirin (japanischer süßer Reiswein) & Sake/Wasser', amount: 2, unit: 'EL', category: 'trockenwaren' },
      { name: 'Ahornsirup', amount: 1.5, unit: 'EL', category: 'trockenwaren' },
      { name: 'Quinoa (bunt oder weiß)', amount: 150, unit: 'g', category: 'trockenwaren' },
      { name: 'Shiitake-Pilze (in Streifen)', amount: 150, unit: 'g', category: 'gemuese' },
      { name: 'Sesamöl & gerösteter weißer & schwarzer Sesam', amount: 2, unit: 'EL', category: 'gewuerze' },
      { name: 'Frühlingszwiebeln (feine Ringe)', amount: 2, unit: 'Stk', category: 'gemuese' },
    ],
    steps: [
      {
            stepNumber: 1,
            title: 'Auberginen einschneiden',
            text: 'Auberginen längs halbieren und das Fruchtfleisch rautenförmig einritzen, ohne die Haut zu verletzen.',
            timerMinutes: 4
      },
      {
            stepNumber: 2,
            title: 'Vorbacken',
            text: 'Schnittflächen mit Sesamöl einpinseln und bei 200 °C für ca. 20 Min. im Ofen weich backen.',
            timerMinutes: 20
      },
      {
            stepNumber: 3,
            title: 'Miso-Glaze anrühren',
            text: 'Helle Miso-Paste, Mirin, Ahornsirup und Sojasauce zu einer glatten Glasur verrühren.',
            timerMinutes: 2
      },
      {
            stepNumber: 4,
            title: 'Shiitake-Quinoa kochen',
            text: 'Quinoa mit Shiitake-Pilzen und Gemüsebrühe ca. 15 Min. köcheln lassen.',
            timerMinutes: 15
      },
      {
            stepNumber: 5,
            title: 'Auberginen glasieren',
            text: 'Die Miso-Glasur großzügig auf die weichen Auberginen streichen und 5 Min. unter dem Ofengrill karamellisieren.',
            timerMinutes: 5
      },
      {
            stepNumber: 6,
            title: 'Anrichten',
            text: 'Den Pilz-Quinoa auf Teller geben, die glänzenden Auberginenhälften darauf platzieren und mit Frühlingszwiebeln toppen.'
      }
]
  },
  {
    id: 'rec-29',
    title: 'Süßer Frucht-Couscous mit Beeren & Zimt',
    subtitle: 'Cremiger Soja-Skyr mit warmem Couscous, Banane und einer feinen Zimtnote',
    image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=1200&q=80',
    category: 'Süßes & Frühstück',
    isVegan: true,
    isVegetarian: true,
    prepTimeMinutes: 5,
    cookTimeMinutes: 0,
    totalTimeMinutes: 5,
    difficulty: 'Einfach',
    servings: 3,
    rating: 4.9,
    reviewCount: 38,
    season: 'Ganzjährig',
    nutrients: {
      calories: 540,
      protein: 28,
      carbs: 88,
      fat: 6,
      fiber: 8,
      iron: 3.8,
      zinc: 2.1,
      calcium: 180,
    },
    tags: ['Vegan', 'High Protein', 'Unter 15 Min', 'Express', 'Frühstück', 'Leicht & Kalorienreich'],
    chefTip: 'Soja-Quark (oder pflanzlicher Skyr) hat fast identische Proteinwerte wie Magerquark, ist von Natur aus cremiger und liegt noch leichter im Magen.',
    ingredients: [
      { name: 'Couscous', amount: 300, unit: 'g', category: 'trockenwaren', isEssential: true },
      { name: 'Kochendes Wasser', amount: 450, unit: 'ml', category: 'trockenwaren' },
      { name: 'Soja-Quark (z.B. Alpro Skyr Style)', amount: 750, unit: 'g', category: 'kuehlregal', isEssential: true },
      { name: 'Reife Bananen', amount: 3, unit: 'Stk', category: 'gemuese' },
      { name: 'Agavendicksaft', amount: 3, unit: 'EL', category: 'trockenwaren' },
      { name: 'Gemahlener Zimt', amount: 1.5, unit: 'TL', category: 'gewuerze' },
    ],
    steps: [
      {
            stepNumber: 1,
            title: 'Couscous quellen lassen',
            text: 'Couscous in eine Schale geben, mit kochendem Wasser oder Pflanzendrink übergießen, abdecken und 5 Min. quellen lassen.',
            timerMinutes: 5
      },
      {
            stepNumber: 2,
            title: 'Couscous auflockern',
            text: 'Mit einer Gabel den gequollenen Couscous auflockern und etwas abkühlen lassen.',
            timerMinutes: 1
      },
      {
            stepNumber: 3,
            title: 'Skyr mit Vanille verrühren',
            text: 'Pflanzlichen Skyr mit Vanilleextrakt und einer Prise Zimt glattrühren.',
            timerMinutes: 2
      },
      {
            stepNumber: 4,
            title: 'Früchte schneiden',
            text: 'Banane in Scheiben schneiden, Beeren waschen oder Beerenkompott bereitstellen.',
            timerMinutes: 2
      },
      {
            stepNumber: 5,
            title: 'Mengen vermengen',
            text: 'Den warmen Couscous vorsichtig unter den Skyr heben.',
            timerMinutes: 1
      },
      {
            stepNumber: 6,
            title: 'Schichten & Toppen',
            text: 'In Gläser oder Schalen schichten, mit Bananenscheiben, Beeren und gehackten Mandeln servieren.'
      }
]
  },
  {
    id: 'rec-30',
    title: 'Tofu-Quinoa-Bowl mit Zitronen-Dressing',
    subtitle: 'Express-Quinoa mit knusprigem Tofu, Gurke, Kirschtomaten und frischem Dressing',
    image: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&w=1200&q=80',
    category: 'Bowls & Salate',
    isVegan: true,
    isVegetarian: true,
    prepTimeMinutes: 8,
    cookTimeMinutes: 0,
    totalTimeMinutes: 8,
    difficulty: 'Einfach',
    servings: 3,
    rating: 4.92,
    reviewCount: 45,
    season: 'Ganzjährig',
    nutrients: {
      calories: 650,
      protein: 32,
      carbs: 74,
      fat: 22,
      fiber: 11,
      iron: 5.6,
      zinc: 3.8,
      calcium: 240,
    },
    tags: ['Vegan', 'High Protein', 'Unter 15 Min', 'Bowl', 'Express', 'Leicht & Kalorienreich'],
    chefTip: 'Express-Quinoa spart Zeit. Wer den Tofu warm mag, brät die Würfel für 2 Minuten mit 1 TL Sesam- oder Rapsöl scharf an!',
    ingredients: [
      { name: 'Express-Quinoa (verzehrfertig)', amount: 750, unit: 'g', category: 'trockenwaren', isEssential: true },
      { name: 'Sweet-Chili-Tofu', amount: 540, unit: 'g', category: 'kuehlregal', isEssential: true },
      { name: 'Salatgurke', amount: 1.5, unit: 'Stk', category: 'gemuese' },
      { name: 'Kirschtomaten', amount: 450, unit: 'g', category: 'gemuese' },
      { name: 'Sojasauce (Tamari)', amount: 6, unit: 'EL', category: 'trockenwaren' },
      { name: 'Agavendicksaft', amount: 3, unit: 'EL', category: 'trockenwaren' },
      { name: 'Zitronensaft (frisch gepresst)', amount: 1.5, unit: 'Stk', category: 'gemuese' },
      { name: 'Sesam (geröstet)', amount: 1.5, unit: 'EL', category: 'gewuerze' },
    ],
    steps: [
      {
            stepNumber: 1,
            title: 'Quinoa erwärmen/kochen',
            text: 'Quinoa garen oder Express-Quinoa kurz erwärmen und in Schüsseln füllen.',
            timerMinutes: 8
      },
      {
            stepNumber: 2,
            title: 'Gemüse schneiden',
            text: 'Gurke und Kirschtomaten in mundgerechte Stücke schneiden, Petersilie fein hacken.',
            timerMinutes: 3
      },
      {
            stepNumber: 3,
            title: 'Tofu würfeln & anbraten',
            text: 'Tofu würfeln und in einer Pfanne mit etwas Olivenöl ca. 6 Min. rundherum kross anbraten.',
            timerMinutes: 6
      },
      {
            stepNumber: 4,
            title: 'Zitronen-Dressing anrühren',
            text: 'Zitronensaft, Olivenöl, Senf, Salz, Pfeffer und eine Prise Ahornsirup zu einem Dressing verquirlen.',
            timerMinutes: 2
      },
      {
            stepNumber: 5,
            title: 'Bowl arrangieren',
            text: 'Gemüse und knusprigen Tofu auf dem Quinoa anrichten.',
            timerMinutes: 2
      },
      {
            stepNumber: 6,
            title: 'Dressing zugeben',
            text: 'Das frische Dressing gleichmäßig über die Bowl träufeln und sofort servieren.'
      }
]
  },
  {
    id: 'rec-31',
    title: 'Tomaten-Pesto-Nudeln mit Rote-Linsen-Pasta',
    subtitle: 'Rote-Linsen-Pasta mit veganem rotem Pesto, Hefeflocken und frischen Cherrytomaten',
    image: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=1200&q=80',
    category: 'Pasta & Gnocchi',
    isVegan: true,
    isVegetarian: true,
    prepTimeMinutes: 2,
    cookTimeMinutes: 8,
    totalTimeMinutes: 10,
    difficulty: 'Einfach',
    servings: 3,
    rating: 4.88,
    reviewCount: 52,
    season: 'Ganzjährig',
    nutrients: {
      calories: 590,
      protein: 36,
      carbs: 72,
      fat: 16,
      fiber: 14,
      iron: 6.2,
      zinc: 4.1,
      calcium: 150,
    },
    tags: ['Vegan', 'High Protein', 'Unter 15 Min', 'Pasta', 'Glutenfrei', 'Leicht & Kalorienreich'],
    chefTip: 'Der Schlüssel für extrem viele Proteine ohne Schweregefühl: Nudeln aus roten Linsen. Sie liefern ordentlich pflanzliches Eiweiß, rutschen leicht und Hefeflocken bringen einen würzig-käsig-nussigen Geschmack sowie B-Vitamine.',
    ingredients: [
      { name: 'Rote-Linsen-Spaghetti oder Penne', amount: 420, unit: 'g', category: 'trockenwaren', isEssential: true },
      { name: 'Veganes rotes Pesto (Rosso)', amount: 9, unit: 'EL', category: 'trockenwaren', isEssential: true },
      { name: 'Hefeflocken', amount: 6, unit: 'EL', category: 'trockenwaren' },
      { name: 'Stärkehaltiges Nudelkochwasser', amount: 6, unit: 'EL', category: 'trockenwaren' },
      { name: 'Cherrytomaten (halbiert)', amount: 300, unit: 'g', category: 'gemuese' },
      { name: 'Frisches Basilikum', amount: 1, unit: 'Handvoll', category: 'gemuese' },
    ],
    steps: [
      {
            stepNumber: 1,
            title: 'Wasser aufkochen',
            text: 'Einen Topf mit reichlich Salzwasser zum Kochen bringen.',
            timerMinutes: 4
      },
      {
            stepNumber: 2,
            title: 'Linsen-Pasta kochen',
            text: 'Die Rote-Linsen-Pasta 6-7 Minuten bissfest kochen.',
            timerMinutes: 7
      },
      {
            stepNumber: 3,
            title: 'Kochwasser abschöpfen',
            text: 'Vor dem Abgießen 4 EL stärkehaltiges Nudelkochwasser auffangen.',
            timerMinutes: 1
      },
      {
            stepNumber: 4,
            title: 'Cherrytomaten schneiden',
            text: 'Cherrytomaten waschen und halbieren.',
            timerMinutes: 2
      },
      {
            stepNumber: 5,
            title: 'Pesto unterrühren',
            text: 'Die heiße Pasta zurück in den Topf geben, Pesto Rosso und Kochwasser zugeben und cremig emulgieren.',
            timerMinutes: 2
      },
      {
            stepNumber: 6,
            title: 'Servieren',
            text: 'Cherrytomaten unterheben, mit Hefeflocken und frischem Basilikum bestreut servieren.'
      }
]
  },
  {
    id: 'rec-32',
    title: 'Soja-Bolognese mit Penne',
    subtitle: 'Bissfeste Nudeln in samtig-würziger Bolognese aus feinem Soja-Granulat und Tomaten',
    image: 'https://images.unsplash.com/photo-1598866594230-a7c12756260f?auto=format&fit=crop&w=1200&q=80',
    category: 'Pasta & Gnocchi',
    isVegan: true,
    isVegetarian: true,
    prepTimeMinutes: 5,
    cookTimeMinutes: 10,
    totalTimeMinutes: 15,
    difficulty: 'Einfach',
    servings: 3,
    rating: 4.95,
    reviewCount: 64,
    season: 'Ganzjährig',
    nutrients: {
      calories: 620,
      protein: 38,
      carbs: 86,
      fat: 9,
      fiber: 13,
      iron: 7.5,
      zinc: 4.8,
      calcium: 190,
    },
    tags: ['Vegan', 'High Protein', 'Unter 20 Min', 'Pasta', 'Klassiker', 'Leicht & Kalorienreich'],
    chefTip: 'Feines Soja-Granulat saugt die Aromen der Tomatenbrühe vollständig auf und sorgt für ein authentisches, leichtes Mundgefühl ohne Cholesterin.',
    ingredients: [
      { name: 'Nudeln (Spaghetti oder Rigatoni)', amount: 375, unit: 'g', category: 'trockenwaren', isEssential: true },
      { name: 'Soja-Granulat (trocken)', amount: 150, unit: 'g', category: 'trockenwaren', isEssential: true },
      { name: 'Stückige Tomaten (Dose)', amount: 800, unit: 'g', category: 'trockenwaren' },
      { name: 'Tomatenmark', amount: 6, unit: 'EL', category: 'trockenwaren' },
      { name: 'Zwiebeln', amount: 2, unit: 'Stk', category: 'gemuese' },
      { name: 'Gemüsebrühe-Pulver', amount: 2, unit: 'TL', category: 'gewuerze' },
      { name: 'Getrockneter Oregano', amount: 2, unit: 'TL', category: 'gewuerze' },
      { name: 'Olivenöl', amount: 1, unit: 'EL', category: 'trockenwaren' },
      { name: 'Salz & schwarzer Pfeffer', amount: 1, unit: 'TL', category: 'gewuerze' },
    ],
    steps: [
      {
            stepNumber: 1,
            title: 'Penne kochen',
            text: 'Penne in reichlich kochendem Salzwasser nach Packungsanleitung al dente kochen.',
            timerMinutes: 10
      },
      {
            stepNumber: 2,
            title: 'Soja-Granulat einweichen',
            text: 'Feines Soja-Granulat mit heißer Gemüsebrühe übergießen und 5 Min. quellen lassen.',
            timerMinutes: 5
      },
      {
            stepNumber: 3,
            title: 'Aromen anschwitzen',
            text: 'Zwiebel und Knoblauch fein hacken und in Olivenöl anschwitzen.',
            timerMinutes: 3
      },
      {
            stepNumber: 4,
            title: 'Granulat anbraten',
            text: 'Das gequollene Soja-Granulat ausdrücken und kräftig mit Tomatenmark anbraten.',
            timerMinutes: 5
      },
      {
            stepNumber: 5,
            title: 'Bolognese einköcheln',
            text: 'Stückige Tomaten und Kräuter zugeben und 10 Min. sanft köcheln lassen.',
            timerMinutes: 10
      },
      {
            stepNumber: 6,
            title: 'Pasta untermischen',
            text: 'Die Penne mit der heißen Bolognese vermengen und servieren.'
      }
]
  },
  {
    id: 'rec-33',
    title: 'Bananen-Proteingrieß mit Zimt',
    subtitle: 'Samtiger Weichweizengrieß mit Pflanzendrink, Banane und Vanilleprotein',
    image: 'https://images.unsplash.com/photo-1584776296944-ab6fb57b0bdd?auto=format&fit=crop&w=1200&q=80',
    category: 'Süßes & Frühstück',
    isVegan: true,
    isVegetarian: true,
    prepTimeMinutes: 2,
    cookTimeMinutes: 5,
    totalTimeMinutes: 7,
    difficulty: 'Einfach',
    servings: 3,
    rating: 4.89,
    reviewCount: 41,
    season: 'Ganzjährig',
    nutrients: {
      calories: 580,
      protein: 34,
      carbs: 84,
      fat: 7,
      fiber: 8,
      iron: 4.2,
      zinc: 2.8,
      calcium: 380,
    },
    tags: ['Vegan', 'High Protein', 'Unter 10 Min', 'Frühstück', 'Süß & Gesund', 'Leicht & Kalorienreich'],
    chefTip: 'Grießbrei mit Pflanzendrink ist die ultimative magenschonende Energiequelle. Das Proteinpulver erst einrühren, nachdem der Topf von der Herdplatte genommen wurde – so bleibt es wunderbar samtig!',
    ingredients: [
      { name: 'Weichweizengrieß', amount: 240, unit: 'g', category: 'trockenwaren', isEssential: true },
      { name: 'Hafer- oder Sojamilch', amount: 1500, unit: 'ml', category: 'kuehlregal', isEssential: true },
      { name: 'Reife Bananen (zerdrückt)', amount: 3, unit: 'Stk', category: 'gemuese' },
      { name: 'Veganes Proteinpulver (z.B. Vanille)', amount: 90, unit: 'g', category: 'trockenwaren', isEssential: true },
      { name: 'Gemahlener Zimt', amount: 1.5, unit: 'TL', category: 'gewuerze' },
      { name: 'Agavendicksaft', amount: 3, unit: 'EL', category: 'trockenwaren' },
    ],
    steps: [
      {
            stepNumber: 1,
            title: 'Pflanzendrink aufkochen',
            text: 'Pflanzendrink in einem kleinen Topf sanft zum Kochen bringen.',
            timerMinutes: 3
      },
      {
            stepNumber: 2,
            title: 'Grieß einrühren',
            text: 'Weichweizengrieß unter ständigem Rühren mit dem Schneebesen einrieseln lassen.',
            timerMinutes: 2
      },
      {
            stepNumber: 3,
            title: 'Banane zerdrücken',
            text: 'Die halbe Banane mit einer Gabel cremig zerdrücken und unter den warmen Grieß rühren.',
            timerMinutes: 2
      },
      {
            stepNumber: 4,
            title: 'Proteinpulver zugeben',
            text: 'Vanille-Proteinpulver mit 2 EL kaltem Wasser vorab glattrühren und unter den Grieß heben.',
            timerMinutes: 1
      },
      {
            stepNumber: 5,
            title: 'Quellen lassen',
            text: 'Topf von der Herdplatte nehmen und den Brei 3 Minuten abgedeckt quellen lassen.',
            timerMinutes: 3
      },
      {
            stepNumber: 6,
            title: 'Mit Zimt servieren',
            text: 'In eine Schale füllen, mit restlichen Bananenscheiben belegen und mit Zimt bestreuen.'
      }
]
  },
  {
    id: 'rec-34',
    title: 'Kichererbsen-Reis-Pfanne mit Tomaten & Kräutern',
    subtitle: 'Express-Reis mit zarten Kichererbsen, fruchtigen Tomaten und Kräutern der Provence',
    image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1200&q=80',
    category: 'Schnelle Feierabendküche',
    isVegan: true,
    isVegetarian: true,
    prepTimeMinutes: 2,
    cookTimeMinutes: 6,
    totalTimeMinutes: 8,
    difficulty: 'Einfach',
    servings: 3,
    rating: 4.87,
    reviewCount: 36,
    season: 'Ganzjährig',
    nutrients: {
      calories: 560,
      protein: 22,
      carbs: 88,
      fat: 9,
      fiber: 12,
      iron: 5.1,
      zinc: 3.3,
      calcium: 110,
    },
    tags: ['Vegan', 'High Protein', 'Unter 10 Min', '1-Topf', 'Glutenfrei', 'Leicht & Kalorienreich'],
    chefTip: 'Die rein vegane Variante des Klassikers – ohne Feta, dafür mit noch mehr Fokus auf leicht verdauliche Carbs und Ballaststoffe.',
    ingredients: [
      { name: 'Express-Reis (250g Packungen)', amount: 3, unit: 'Packung', category: 'trockenwaren', isEssential: true },
      { name: 'Kichererbsen (Dose, abgespült)', amount: 720, unit: 'g', category: 'huelsenfruechte', isEssential: true },
      { name: 'Stückige Tomaten (Dose)', amount: 800, unit: 'g', category: 'trockenwaren' },
      { name: 'Olivenöl', amount: 1, unit: 'EL', category: 'trockenwaren' },
      { name: 'Kräuter der Provence', amount: 2, unit: 'TL', category: 'gewuerze' },
      { name: 'Prise Zucker', amount: 1, unit: 'Prise', category: 'gewuerze' },
      { name: 'Salz & Pfeffer', amount: 1, unit: 'TL', category: 'gewuerze' },
    ],
    steps: [
      {
            stepNumber: 1,
            title: 'Zwiebeln anbraten',
            text: 'Zwiebel und Knoblauch fein hacken und in 1 EL Olivenöl in einer Pfanne 2-3 Min. andünsten.',
            timerMinutes: 3
      },
      {
            stepNumber: 2,
            title: 'Kichererbsen abspülen',
            text: 'Kichererbsen in einem Sieb abspülen, abtropfen lassen und in die Pfanne geben.',
            timerMinutes: 2
      },
      {
            stepNumber: 3,
            title: 'Kräuter & Tomaten zugeben',
            text: 'Kräuter der Provence, Tomatenmark und gehackte Tomaten einrühren.',
            timerMinutes: 2
      },
      {
            stepNumber: 4,
            title: 'Reis einrühren',
            text: 'Gekochten Reis (oder Express-Reis) in die Pfanne geben und gründlich untermischen.',
            timerMinutes: 2
      },
      {
            stepNumber: 5,
            title: 'Einköcheln lassen',
            text: 'Bei mittlerer Hitze ca. 5 Minuten durchziehen lassen, bis der Reis heiß und aromatisch ist.',
            timerMinutes: 5
      },
      {
            stepNumber: 6,
            title: 'Abschmecken & Servieren',
            text: 'Mit Meersalz und Pfeffer abschmecken und mit frischer Petersilie garniert servieren.'
      }
]
  }
];

export const PANTRY_QUICK_ITEMS = [
  'Veganes Hack',
  'Vegane Filetspitzen',
  'Seitan',
  'Räuchertofu',
  'Tempeh',
  'Tofu',
  'Kichererbsen',
  'Rote Linsen',
  'Schwarze Bohnen',
  'Edamame',
  'Mandel-Feta',
  'Veganer Cheddar',
  'Hefeflocken',
  'Cashewkerne',
  'Spinat',
  'Tomaten',
  'Zucchini',
  'Auberginen',
  'Paprika',
  'Champignons / Kräuterseitlinge',
  'Brokkoli',
  'Avocado',
  'Süßkartoffeln',
  'Knoblauch & Zwiebeln',
  'Pasta / Rigatoni',
  'Gnocchi',
  'Reis / Quinoa',
  'Haferflocken',
  'Kokosmilch',
  'Hafer-Kochcreme',
  'Pistazienmus',
  'Erdnussbutter',
  'Gochujang-Paste',
  'Sojasauce / Tamari',
  'Zitrone / Limette'
];

import { DayPlan } from '../types';

export const INITIAL_MEAL_PLAN: DayPlan[] = [
  {
    dayId: 'mon',
    dayName: 'Montag',
    dateStr: 'Tag 1',
    lunch: null,
    dinner: {
      recipeId: 'rec-1',
      recipeTitle: 'Cremiges Kichererbsen-Kokos-Curry mit Spinat',
      isVegan: true,
      prepTime: 25,
      calories: 460,
      protein: 21,
      servings: 2,
    },
  },
  {
    dayId: 'tue',
    dayName: 'Dienstag',
    dateStr: 'Tag 2',
    lunch: null,
    dinner: {
      recipeId: 'rec-2',
      recipeTitle: 'Mediterrane Ofen-Gnocchi mit Feta & Kirschtomaten',
      isVegan: false,
      prepTime: 25,
      calories: 520,
      protein: 19,
      servings: 2,
    },
  },
  {
    dayId: 'wed',
    dayName: 'Mittwoch',
    dateStr: 'Tag 3',
    lunch: {
      recipeId: 'rec-10',
      recipeTitle: 'Vegane Overnight Chia-Oats',
      isVegan: true,
      prepTime: 5,
      calories: 390,
      protein: 17,
      servings: 1,
    },
    dinner: {
      recipeId: 'rec-3',
      recipeTitle: 'Vegane Peanut-Tofu Bowl mit Edamame',
      isVegan: true,
      prepTime: 30,
      calories: 580,
      protein: 34,
      servings: 2,
    },
  },
  {
    dayId: 'thu',
    dayName: 'Donnerstag',
    dateStr: 'Tag 4',
    lunch: null,
    dinner: {
      recipeId: 'rec-6',
      recipeTitle: 'Cremiges Rote-Linsen Dal mit Kokos & Koriander',
      isVegan: true,
      prepTime: 25,
      calories: 440,
      protein: 23,
      servings: 2,
    },
  },
  {
    dayId: 'fri',
    dayName: 'Freitag',
    dateStr: 'Tag 5',
    lunch: null,
    dinner: {
      recipeId: 'rec-12',
      recipeTitle: 'Vegane Pasta alla Vodka mit Cashew-Sauce',
      isVegan: true,
      prepTime: 25,
      calories: 540,
      protein: 18,
      servings: 2,
    },
  },
  {
    dayId: 'sat',
    dayName: 'Samstag',
    dateStr: 'Tag 6',
    lunch: null,
    dinner: {
      recipeId: 'rec-9',
      recipeTitle: 'Cremiges Pilz-Risotto mit Trüffelöl & Pinienkernen',
      isVegan: false,
      prepTime: 35,
      calories: 490,
      protein: 16,
      servings: 2,
    },
  },
  {
    dayId: 'sun',
    dayName: 'Sonntag',
    dateStr: 'Tag 7',
    lunch: null,
    dinner: {
      recipeId: 'rec-8',
      recipeTitle: 'Gefüllte Ofen-Süßkartoffel mit Schwarze-Bohnen-Chili',
      isVegan: true,
      prepTime: 35,
      calories: 460,
      protein: 19,
      servings: 2,
    },
  },
];
