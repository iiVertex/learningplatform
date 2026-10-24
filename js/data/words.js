// Vocabulary bank.
// Each entry: [id, Arabic with full harakat, English, emoji fallback, picture source]
// Picture source (optional, defaults to the English word as a Wikipedia article title):
//   'Title'            → lead image of that English Wikipedia article
//   'commons:search'   → first matching photo on Wikimedia Commons
//   'file:Name.jpg'    → a specific Wikimedia Commons file
//   'color:#hex'       → a colour swatch (no download)
//   'emoji'            → show the emoji instead of a photo (when no clear photo exists)
// Male/female pairs are listed at the end (GENDER_PAIRS): each word gets g: 'm' | 'f' and pair: <partner id>.
// Tier = difficulty band. Tier 1 → stage 1 (weeks 1-4), tier 2 → stage 2 (weeks 5-9), and so on.
window.WORDS = [];
(function () {
  function add(tier, cat, list) {
    list.forEach(function (w) {
      WORDS.push({ id: w[0], ar: w[1], en: w[2], emoji: w[3], img: w[4] || w[2], cat: cat, tier: tier });
    });
  }

  // ───────────── Tier 1: the most common, concrete words ─────────────
  add(1, 'animals', [
    ['cat', 'قِطٌّ', 'Cat', '🐱'],
    ['dog', 'كَلْبٌ', 'Dog', '🐶'],
    ['horse', 'حِصَانٌ', 'Horse', '🐴'],
    ['cow', 'بَقَرَةٌ', 'Cow', '🐄', 'Cattle'],
    ['lion', 'أَسَدٌ', 'Lion', '🦁'],
    ['fish', 'سَمَكَةٌ', 'Fish', '🐟', 'Goldfish'],
  ]);
  add(1, 'family', [
    ['father', 'أَبٌ', 'Father', '👨', 'Father'],
    ['mother', 'أُمٌّ', 'Mother', '👩', 'Mother'],
    ['boy', 'وَلَدٌ', 'Boy', '👦'],
    ['girl', 'بِنْتٌ', 'Girl', '👧'],
    ['grandfather', 'جَدٌّ', 'Grandfather', '👴', 'Grandparent'],
    ['grandmother', 'جَدَّةٌ', 'Grandmother', '👵', 'commons:grandmother grandchild'],
  ]);
  add(1, 'body', [
    ['eye', 'عَيْنٌ', 'Eye', '👁️', 'Human eye'],
    ['ear', 'أُذُنٌ', 'Ear', '👂'],
    ['nose', 'أَنْفٌ', 'Nose', '👃', 'Human nose'],
    ['mouth', 'فَمٌ', 'Mouth', '👄', 'commons:child smiling teeth'],
    ['hand', 'يَدٌ', 'Hand', '✋'],
    ['leg', 'رِجْلٌ', 'Leg', '🦵', 'commons:legs jeans walking'],
  ]);
  add(1, 'home', [
    ['house', 'بَيْتٌ', 'House', '🏠', 'commons:suburban house'],
    ['door', 'بَابٌ', 'Door', '🚪', 'commons:wooden front door house'],
    ['window', 'نَافِذَةٌ', 'Window', '🪟', 'commons:house window glass white frame'],
    ['bed', 'سَرِيرٌ', 'Bed', '🛏️'],
    ['chair', 'كُرْسِيٌّ', 'Chair', '🪑'],
    ['table', 'طَاوِلَةٌ', 'Table', '🪵', 'Table (furniture)'],
  ]);
  add(1, 'appliances', [
    ['fridge', 'ثَلَّاجَةٌ', 'Refrigerator', '🧊'],
    ['tv', 'تِلْفَازٌ', 'Television', '📺', 'commons:flat screen television living room'],
    ['lamp', 'مِصْبَاحٌ', 'Lamp', '💡', 'commons:table lamp lampshade'],
    ['phone', 'هَاتِفٌ', 'Phone', '📱', 'Smartphone'],
    ['fan', 'مِرْوَحَةٌ', 'Fan', '🌀', 'Mechanical fan'],
    ['washer', 'غَسَّالَةٌ', 'Washing machine', '🧺', 'Washing machine'],
  ]);
  add(1, 'kitchen', [
    ['cup', 'كُوبٌ', 'Cup', '🥤', 'Mug'],
    ['spoon', 'مِلْعَقَةٌ', 'Spoon', '🥄'],
    ['plate', 'صَحْنٌ', 'Plate', '🍽️', 'Plate (dishware)'],
    ['knife', 'سِكِّينٌ', 'Knife', '🔪', 'Kitchen knife'],
    ['fork', 'شَوْكَةٌ', 'Fork', '🍴'],
    ['pot', 'قِدْرٌ', 'Cooking pot', '🍲', 'commons:cooking pot stove'],
  ]);
  add(1, 'food', [
    ['bread', 'خُبْزٌ', 'Bread', '🍞'],
    ['water', 'مَاءٌ', 'Water', '💧', 'Drinking water'],
    ['milk', 'حَلِيبٌ', 'Milk', '🥛'],
    ['egg', 'بَيْضَةٌ', 'Egg', '🥚', 'Egg as food'],
    ['rice', 'أَرُزٌّ', 'Rice', '🍚', 'commons:bowl of cooked white rice'],
    ['cheese', 'جُبْنٌ', 'Cheese', '🧀'],
  ]);
  add(1, 'fruitveg', [
    ['apple', 'تُفَّاحَةٌ', 'Apple', '🍎'],
    ['banana', 'مَوْزَةٌ', 'Banana', '🍌'],
    ['orange', 'بُرْتُقَالَةٌ', 'Orange', '🍊', 'Orange (fruit)'],
    ['grapes', 'عِنَبٌ', 'Grapes', '🍇', 'Grape'],
    ['tomato', 'طَمَاطِمُ', 'Tomato', '🍅'],
    ['carrot', 'جَزَرَةٌ', 'Carrot', '🥕'],
  ]);
  add(1, 'clothes', [
    ['shirt', 'قَمِيصٌ', 'Shirt', '👕', 'commons:t-shirt white background'],
    ['shoe', 'حِذَاءٌ', 'Shoe', '👟', 'commons:sneakers pair'],
    ['hat', 'قُبَّعَةٌ', 'Hat', '👒', 'commons:sun hat straw'],
    ['dress', 'فُسْتَانٌ', 'Dress', '👗', 'commons:red dress mannequin'],
    ['trousers', 'بِنْطَالٌ', 'Trousers', '👖'],
    ['sock', 'جَوْرَبٌ', 'Sock', '🧦'],
  ]);
  add(1, 'school', [
    ['book', 'كِتَابٌ', 'Book', '📖'],
    ['pencil', 'قَلَمٌ', 'Pen / pencil', '✏️', 'Pencil'],
    ['notebook', 'دَفْتَرٌ', 'Notebook', '📓'],
    ['bag', 'حَقِيبَةٌ', 'School bag', '🎒', 'Backpack'],
    ['school', 'مَدْرَسَةٌ', 'School', '🏫'],
    ['eraser', 'مِمْحَاةٌ', 'Eraser', '🧽'],
  ]);
  add(1, 'transport', [
    ['car', 'سَيَّارَةٌ', 'Car', '🚗', 'commons:hatchback car'],
    ['bus', 'حَافِلَةٌ', 'Bus', '🚌'],
    ['airplane', 'طَائِرَةٌ', 'Airplane', '✈️'],
    ['train', 'قِطَارٌ', 'Train', '🚆'],
    ['ship', 'سَفِينَةٌ', 'Ship', '🚢'],
    ['bicycle', 'دَرَّاجَةٌ', 'Bicycle', '🚲'],
  ]);
  add(1, 'jobs', [
    ['doctor', 'طَبِيبٌ', 'Doctor', '🧑‍⚕️', 'commons:doctor stethoscope white coat'],
    ['teacher', 'مُعَلِّمٌ', 'Teacher', '🧑‍🏫'],
    ['police', 'شُرْطِيٌّ', 'Police officer', '👮', 'Police officer'],
    ['cook', 'طَبَّاخٌ', 'Cook', '🧑‍🍳', 'commons:chef uniform hat'],
    ['farmer', 'مُزَارِعٌ', 'Farmer', '🧑‍🌾'],
    ['pilot', 'طَيَّارٌ', 'Pilot', '🧑‍✈️', 'Aircraft pilot'],
  ]);
  add(1, 'places', [
    ['mosque', 'مَسْجِدٌ', 'Mosque', '🕌'],
    ['market', 'سُوقٌ', 'Market', '🛒', 'Marketplace'],
    ['garden', 'حَدِيقَةٌ', 'Garden / park', '🌳', 'Garden'],
    ['hospital', 'مُسْتَشْفًى', 'Hospital', '🏥'],
    ['restaurant', 'مَطْعَمٌ', 'Restaurant', '🍽️'],
    ['bakery', 'مَخْبَزٌ', 'Bakery', '🥖'],
  ]);
  add(1, 'nature', [
    ['sun', 'شَمْسٌ', 'Sun', '☀️', 'emoji'],
    ['moon', 'قَمَرٌ', 'Moon', '🌙'],
    ['tree', 'شَجَرَةٌ', 'Tree', '🌳'],
    ['sea', 'بَحْرٌ', 'Sea', '🌊', 'commons:sea waves blue horizon'],
    ['rose', 'وَرْدَةٌ', 'Rose / flower', '🌹', 'Rose'],
    ['mountain', 'جَبَلٌ', 'Mountain', '⛰️'],
  ]);

  add(1, 'gender', [
    ['bull', 'ثَوْرٌ', 'Bull', '🐂', 'Bull'],
    ['teacher-f', 'مُعَلِّمَةٌ', 'Teacher (female)', '👩‍🏫', 'file:RIVKA TEACHING IMMIGRANT CHILDREN AT MOSHAV MENUHA.jpg'],
    ['doctor-f', 'طَبِيبَةٌ', 'Doctor (female)', '👩‍⚕️', 'commons:female doctor stethoscope'],
  ]);

  // ───────────── Tier 2: more everyday words ─────────────
  add(2, 'animals', [
    ['camel', 'جَمَلٌ', 'Camel', '🐪'],
    ['elephant', 'فِيلٌ', 'Elephant', '🐘'],
    ['monkey', 'قِرْدٌ', 'Monkey', '🐒'],
    ['hen', 'دَجَاجَةٌ', 'Hen', '🐔', 'Chicken'],
    ['sheep', 'خَرُوفٌ', 'Sheep', '🐑'],
    ['rabbit', 'أَرْنَبٌ', 'Rabbit', '🐇'],
    ['sparrow', 'عُصْفُورٌ', 'Little bird', '🐦', 'House sparrow'],
    ['giraffe', 'زَرَافَةٌ', 'Giraffe', '🦒'],
  ]);
  add(2, 'family', [
    ['brother', 'أَخٌ', 'Brother', '👦', 'commons:two brothers smiling'],
    ['sister', 'أُخْتٌ', 'Sister', '👧', 'commons:two sisters smiling'],
    ['child', 'طِفْلٌ', 'Child / baby', '👶', 'Infant'],
    ['man', 'رَجُلٌ', 'Man', '👨'],
    ['woman', 'امْرَأَةٌ', 'Woman', '👩'],
    ['friend', 'صَدِيقٌ', 'Friend', '🤝', 'Friendship'],
  ]);
  add(2, 'body', [
    ['head', 'رَأْسٌ', 'Head', '🙂', 'commons:boy portrait face'],
    ['hair', 'شَعْرٌ', 'Hair', '💇', 'commons:long hair girl back'],
    ['tooth', 'سِنٌّ', 'Tooth', '🦷', 'Human tooth'],
    ['belly', 'بَطْنٌ', 'Belly', '🫃', 'emoji'],
    ['finger', 'إِصْبَعٌ', 'Finger', '☝️', 'commons:pointing finger'],
    ['foot', 'قَدَمٌ', 'Foot', '🦶'],
  ]);
  add(2, 'home', [
    ['kitchen', 'مَطْبَخٌ', 'Kitchen', '🍳'],
    ['bathroom', 'حَمَّامٌ', 'Bathroom', '🛁', 'commons:bathroom'],
    ['stairs', 'سُلَّمٌ', 'Stairs', '🪜', 'Stairs'],
    ['wall', 'جِدَارٌ', 'Wall', '🧱', 'commons:brick wall'],
    ['sofa', 'أَرِيكَةٌ', 'Sofa', '🛋️', 'Couch'],
    ['wardrobe', 'خِزَانَةٌ', 'Wardrobe', '🚪', 'commons:wooden wardrobe furniture'],
    ['mirror', 'مِرْآةٌ', 'Mirror', '🪞'],
    ['carpet', 'سَجَّادَةٌ', 'Carpet', '🟥'],
  ]);
  add(2, 'appliances', [
    ['oven', 'فُرْنٌ', 'Oven', '🔥', 'commons:electric oven door'],
    ['aircon', 'مُكَيِّفٌ', 'Air conditioner', '❄️', 'Air conditioning'],
    ['computer', 'حَاسُوبٌ', 'Computer', '💻', 'Laptop'],
    ['iron', 'مِكْوَاةٌ', 'Iron', '👔', 'Clothes iron'],
    ['clock', 'سَاعَةٌ', 'Clock / watch', '⏰', 'Clock'],
    ['kettle', 'غَلَّايَةٌ', 'Kettle', '🫖'],
    ['blender', 'خَلَّاطٌ', 'Blender', '🥤', 'Blender (appliance)'],
    ['broom', 'مِكْنَسَةٌ', 'Broom', '🧹'],
  ]);
  add(2, 'kitchen', [
    ['teapot', 'إِبْرِيقٌ', 'Teapot', '🫖'],
    ['pan', 'مِقْلَاةٌ', 'Frying pan', '🍳', 'Frying pan'],
    ['bottle', 'زُجَاجَةٌ', 'Bottle', '🍾'],
    ['tray', 'صِينِيَّةٌ', 'Tray', '🍽️'],
  ]);
  add(2, 'food', [
    ['meat', 'لَحْمٌ', 'Meat', '🥩'],
    ['honey', 'عَسَلٌ', 'Honey', '🍯'],
    ['sugar', 'سُكَّرٌ', 'Sugar', '🍬'],
    ['salt', 'مِلْحٌ', 'Salt', '🧂', 'emoji'],
    ['juice', 'عَصِيرٌ', 'Juice', '🧃'],
    ['tea', 'شَايٌ', 'Tea', '🍵', 'commons:glass of tea'],
    ['dates', 'تَمْرٌ', 'Dates', '🌴', 'commons:dried dates fruit'],
    ['cake', 'كَعْكَةٌ', 'Cake', '🎂'],
  ]);
  add(2, 'fruitveg', [
    ['watermelon', 'بِطِّيخَةٌ', 'Watermelon', '🍉', 'commons:watermelon slice'],
    ['strawberry', 'فَرَاوِلَةٌ', 'Strawberry', '🍓'],
    ['lemon', 'لَيْمُونَةٌ', 'Lemon', '🍋'],
    ['pomegranate', 'رُمَّانَةٌ', 'Pomegranate', '🔴'],
    ['cucumber', 'خِيَارٌ', 'Cucumber', '🥒'],
    ['onion', 'بَصَلَةٌ', 'Onion', '🧅'],
    ['potato', 'بَطَاطِسُ', 'Potatoes', '🥔', 'Potato'],
    ['lettuce', 'خَسٌّ', 'Lettuce', '🥬', 'commons:lettuce vegetable'],
  ]);
  add(2, 'clothes', [
    ['coat', 'مِعْطَفٌ', 'Coat', '🧥', 'commons:winter coat jacket'],
    ['glasses', 'نَظَّارَةٌ', 'Glasses', '👓'],
    ['thobe', 'ثَوْبٌ', 'Thobe', '🥼', 'Thawb'],
    ['skirt', 'تَنُّورَةٌ', 'Skirt', '👗', 'commons:denim skirt'],
    ['glove', 'قُفَّازٌ', 'Glove', '🧤'],
    ['belt', 'حِزَامٌ', 'Belt', '🪢', 'Belt (clothing)'],
  ]);
  add(2, 'school', [
    ['classroom', 'فَصْلٌ', 'Classroom', '🏫'],
    ['board', 'سَبُّورَةٌ', 'Board', '🧑‍🏫', 'Blackboard'],
    ['ruler', 'مِسْطَرَةٌ', 'Ruler', '📏'],
    ['scissors', 'مِقَصٌّ', 'Scissors', '✂️'],
    ['student', 'طَالِبٌ', 'Student', '🧑‍🎓'],
    ['library', 'مَكْتَبَةٌ', 'Library', '📚'],
    ['paper', 'وَرَقَةٌ', 'Paper', '📄', 'commons:blank paper sheet'],
    ['sharpener', 'مِبْرَاةٌ', 'Sharpener', '✏️', 'Pencil sharpener'],
  ]);
  add(2, 'transport', [
    ['truck', 'شَاحِنَةٌ', 'Truck', '🚚'],
    ['motorcycle', 'دَرَّاجَةٌ نَارِيَّةٌ', 'Motorcycle', '🏍️'],
    ['ambulance', 'سَيَّارَةُ إِسْعَافٍ', 'Ambulance', '🚑'],
    ['boat', 'قَارِبٌ', 'Boat', '🚤'],
    ['helicopter', 'مِرْوَحِيَّةٌ', 'Helicopter', '🚁'],
    ['taxi', 'سَيَّارَةُ أُجْرَةٍ', 'Taxi', '🚕'],
    ['trafficlight', 'إِشَارَةُ مُرُورٍ', 'Traffic light', '🚦', 'Traffic light'],
    ['rocket', 'صَارُوخٌ', 'Rocket', '🚀'],
  ]);
  add(2, 'jobs', [
    ['engineer', 'مُهَنْدِسٌ', 'Engineer', '👷', 'commons:engineer hard hat construction site'],
    ['carpenter', 'نَجَّارٌ', 'Carpenter', '🪚'],
    ['baker', 'خَبَّازٌ', 'Baker', '🥖'],
    ['nurse', 'مُمَرِّضَةٌ', 'Nurse', '👩‍⚕️'],
    ['firefighter', 'إِطْفَائِيٌّ', 'Firefighter', '🧑‍🚒'],
    ['driver', 'سَائِقٌ', 'Driver', '🚖', 'commons:taxi driver'],
    ['barber', 'حَلَّاقٌ', 'Barber', '💈'],
    ['fisherman', 'صَيَّادٌ', 'Fisherman', '🎣', 'commons:fishermen boat nets'],
  ]);
  add(2, 'places', [
    ['airport', 'مَطَارٌ', 'Airport', '🛫', 'commons:airport terminal airplanes gate'],
    ['street', 'شَارِعٌ', 'Street', '🛣️'],
    ['stadium', 'مَلْعَبٌ', 'Stadium / playground', '🏟️', 'Stadium'],
    ['pharmacy', 'صَيْدَلِيَّةٌ', 'Pharmacy', '💊', 'Pharmacy (shop)'],
    ['city', 'مَدِينَةٌ', 'City', '🏙️'],
    ['village', 'قَرْيَةٌ', 'Village', '🏡'],
    ['zoo', 'حَدِيقَةُ الْحَيَوَانَاتِ', 'Zoo', '🦓', 'commons:zoo visitors animals enclosure'],
    ['beach', 'شَاطِئٌ', 'Beach', '🏖️'],
  ]);
  add(2, 'nature', [
    ['star', 'نَجْمَةٌ', 'Star', '⭐', 'emoji'],
    ['sky', 'سَمَاءٌ', 'Sky', '🌤️', 'commons:blue sky white clouds'],
    ['rain', 'مَطَرٌ', 'Rain', '🌧️', 'emoji'],
    ['cloud', 'غَيْمَةٌ', 'Cloud', '☁️', 'commons:cumulus cloud blue sky'],
    ['river', 'نَهْرٌ', 'River', '🏞️'],
    ['desert', 'صَحْرَاءُ', 'Desert', '🏜️'],
    ['snow', 'ثَلْجٌ', 'Snow', '❄️', 'commons:snowman'],
    ['fire', 'نَارٌ', 'Fire', '🔥'],
  ]);
  add(2, 'colors', [
    ['red', 'أَحْمَرُ', 'Red', '🔴', 'color:#e53935'],
    ['blue', 'أَزْرَقُ', 'Blue', '🔵', 'color:#1e6fe0'],
    ['green', 'أَخْضَرُ', 'Green', '🟢', 'color:#2e9e44'],
    ['yellow', 'أَصْفَرُ', 'Yellow', '🟡', 'color:#fdd835'],
    ['white', 'أَبْيَضُ', 'White', '⚪', 'color:#ffffff'],
    ['black', 'أَسْوَدُ', 'Black', '⚫', 'color:#1b1b1b'],
    ['orangecolor', 'بُرْتُقَالِيٌّ', 'Orange (colour)', '🟠', 'color:#fb8c00'],
    ['brown', 'بُنِّيٌّ', 'Brown', '🟤', 'color:#7b4a2a'],
  ]);
  add(2, 'play', [
    ['ball', 'كُرَةٌ', 'Ball', '⚽', 'Ball (association football)'],
    ['swimming', 'سِبَاحَةٌ', 'Swimming', '🏊'],
    ['running', 'جَرْيٌ', 'Running', '🏃'],
    ['swing', 'مَرْجُوحَةٌ', 'Swing', '🛝', 'Swing (seat)'],
    ['doll', 'دُمْيَةٌ', 'Doll', '🪆'],
    ['kite', 'طَائِرَةٌ وَرَقِيَّةٌ', 'Kite', '🪁'],
  ]);
  add(2, 'tools', [
    ['key', 'مِفْتَاحٌ', 'Key', '🔑', 'Key (lock)'],
    ['toothbrush', 'فُرْشَاةُ أَسْنَانٍ', 'Toothbrush', '🪥'],
    ['soap', 'صَابُونٌ', 'Soap', '🧼'],
    ['towel', 'مِنْشَفَةٌ', 'Towel', '🧻'],
    ['hammer', 'مِطْرَقَةٌ', 'Hammer', '🔨', 'commons:claw hammer'],
    ['umbrella', 'مِظَلَّةٌ', 'Umbrella', '☂️'],
  ]);
  add(2, 'gender', [
    ['rooster', 'دِيكٌ', 'Rooster', '🐓', 'file:Rooster crowing nsw.jpg'],
    ['shecamel', 'نَاقَةٌ', 'She-camel', '🐪', 'file:20150115 SB Yemen IMG 8130.jpg'],
    ['ram', 'كَبْشٌ', 'Ram', '🐏', 'commons:ram sheep horns'],
    ['ewe', 'نَعْجَةٌ', 'Ewe', '🐑', 'file:Ewe and Lambs - geograph.org.uk - 758956.jpg'],
    ['nurse-m', 'مُمَرِّضٌ', 'Nurse (male)', '👨‍⚕️', 'file:Nurse Abram.jpg'],
    ['student-f', 'طَالِبَةٌ', 'Student (female)', '👩‍🎓', 'file:Schoolgirls in Bamozai.JPG'],
    ['friend-f', 'صَدِيقَةٌ', 'Friend (female)', '👭', 'file:Two little Lao girls hugging.jpg'],
    ['child-f', 'طِفْلَةٌ', 'Child (female)', '👧', 'commons:little girl smiling'],
  ]);

  // Male ↔ female pairs. The new-word card shows the partner, and these words also get a
  // "مُذَكَّرٌ أَمْ مُؤَنَّثٌ؟" game.
  var GENDER_PAIRS = [
    ['bull', 'cow'], ['rooster', 'hen'], ['camel', 'shecamel'], ['ram', 'ewe'],
    ['teacher', 'teacher-f'], ['doctor', 'doctor-f'], ['nurse-m', 'nurse'],
    ['student', 'student-f'], ['friend', 'friend-f'], ['child', 'child-f'], ['boy', 'girl'], ['man', 'woman'],
    ['father', 'mother'], ['grandfather', 'grandmother'], ['brother', 'sister'],
  ];
  var byId = {};
  WORDS.forEach(function (w) { byId[w.id] = w; });
  GENDER_PAIRS.forEach(function (pr) {
    var m = byId[pr[0]], f = byId[pr[1]];
    m.g = 'm'; m.pair = f.id;
    f.g = 'f'; f.pair = m.id;
  });
})();
