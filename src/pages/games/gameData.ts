// src/pages/games/gameData.ts
// ─── All static data pools for Chillverse games ─────────────

// ════════════════════════════════════════════
// TRIVIA CLASH — 85 questions, easy + medium
// ════════════════════════════════════════════
export interface TriviaQuestion {
  q: string
  a: [string, string, string, string]
  correct: 0 | 1 | 2 | 3
  difficulty: 'easy' | 'medium'
}

export const TRIVIA_QUESTIONS: TriviaQuestion[] = [
  // ── SCIENCE ──
  { q: 'What planet is known as the Red Planet?', a: ['Mars','Venus','Saturn','Jupiter'], correct: 0, difficulty: 'easy' },
  { q: 'What gas do plants absorb from the air?', a: ['Oxygen','Nitrogen','CO₂','Hydrogen'], correct: 2, difficulty: 'easy' },
  { q: 'Which metal is liquid at room temperature?', a: ['Iron','Gold','Mercury','Silver'], correct: 2, difficulty: 'easy' },
  { q: 'What is H₂O?', a: ['Air','Water','Fire','Earth'], correct: 1, difficulty: 'easy' },
  { q: 'What is the hardest natural substance?', a: ['Iron','Granite','Quartz','Diamond'], correct: 3, difficulty: 'easy' },
  { q: 'Which element has the atomic number 1?', a: ['Helium','Oxygen','Hydrogen','Carbon'], correct: 2, difficulty: 'easy' },
  { q: 'What is the chemical symbol for gold?', a: ['Gd','Go','Au','Ag'], correct: 2, difficulty: 'easy' },
  { q: 'How many bones are in the adult human body?', a: ['196','206','216','226'], correct: 1, difficulty: 'easy' },
  { q: 'What organ pumps blood through the body?', a: ['Lungs','Liver','Brain','Heart'], correct: 3, difficulty: 'easy' },
  { q: 'What is the speed of light (approx km/s)?', a: ['100k','300k','500k','1M'], correct: 1, difficulty: 'medium' },
  { q: 'What is the powerhouse of the cell?', a: ['Nucleus','Ribosome','Mitochondria','Golgi Body'], correct: 2, difficulty: 'easy' },
  { q: 'What force keeps planets in orbit?', a: ['Magnetism','Gravity','Friction','Tension'], correct: 1, difficulty: 'easy' },
  { q: 'What is the most abundant gas in Earth\'s atmosphere?', a: ['Oxygen','CO₂','Nitrogen','Argon'], correct: 2, difficulty: 'medium' },
  { q: 'What unit measures electrical resistance?', a: ['Volt','Watt','Ohm','Ampere'], correct: 2, difficulty: 'medium' },
  { q: 'What is the boiling point of water in Fahrenheit?', a: ['100°F','180°F','212°F','250°F'], correct: 2, difficulty: 'medium' },
  { q: 'How many chromosomes does a human have?', a: ['23','44','46','48'], correct: 2, difficulty: 'medium' },
  { q: 'What is Newton\'s first law about?', a: ['Force equals mass × acceleration','Inertia','Action-reaction','Conservation of energy'], correct: 1, difficulty: 'medium' },
  // ── MATH ──
  { q: 'How many sides does a hexagon have?', a: ['5','6','7','8'], correct: 1, difficulty: 'easy' },
  { q: 'What is the square root of 144?', a: ['11','12','13','14'], correct: 1, difficulty: 'easy' },
  { q: 'How many degrees in a right angle?', a: ['45','60','90','180'], correct: 2, difficulty: 'easy' },
  { q: 'What is 15% of 200?', a: ['20','25','30','35'], correct: 2, difficulty: 'easy' },
  { q: 'How many days in a leap year?', a: ['364','365','366','367'], correct: 2, difficulty: 'easy' },
  { q: 'What is the value of π (approx)?', a: ['2.71','3.14','3.41','3.17'], correct: 1, difficulty: 'easy' },
  { q: 'What is 7 × 8?', a: ['54','56','62','64'], correct: 1, difficulty: 'easy' },
  { q: 'What is the prime number closest to 20?', a: ['17','18','19','21'], correct: 2, difficulty: 'medium' },
  { q: 'What is 2 to the power of 10?', a: ['512','1024','256','2048'], correct: 1, difficulty: 'medium' },
  { q: 'What is the sum of angles in a triangle?', a: ['90°','120°','180°','360°'], correct: 2, difficulty: 'easy' },
  // ── GEOGRAPHY ──
  { q: 'Which country has the largest population?', a: ['India','USA','China','Brazil'], correct: 2, difficulty: 'easy' },
  { q: 'What is the capital of Japan?', a: ['Seoul','Beijing','Tokyo','Bangkok'], correct: 2, difficulty: 'easy' },
  { q: 'How many continents are there?', a: ['5','6','7','8'], correct: 2, difficulty: 'easy' },
  { q: 'What is the largest ocean?', a: ['Atlantic','Indian','Arctic','Pacific'], correct: 3, difficulty: 'easy' },
  { q: 'Which is the smallest continent?', a: ['Antarctica','Europe','Australia','S. America'], correct: 2, difficulty: 'easy' },
  { q: 'What is the capital of Nigeria?', a: ['Lagos','Abuja','Kano','Ibadan'], correct: 1, difficulty: 'easy' },
  { q: 'Which river is the longest in the world?', a: ['Amazon','Congo','Mississippi','Nile'], correct: 3, difficulty: 'medium' },
  { q: 'What country has the most natural lakes?', a: ['USA','Russia','Brazil','Canada'], correct: 3, difficulty: 'medium' },
  { q: 'In which continent is the Sahara Desert?', a: ['Asia','Africa','Australia','South America'], correct: 1, difficulty: 'easy' },
  { q: 'What is the smallest country in the world?', a: ['Monaco','San Marino','Vatican City','Liechtenstein'], correct: 2, difficulty: 'medium' },
  // ── HISTORY ──
  { q: 'In what year did World War 2 end?', a: ['1943','1944','1945','1946'], correct: 2, difficulty: 'easy' },
  { q: 'Who invented the telephone?', a: ['Edison','Tesla','Bell','Morse'], correct: 2, difficulty: 'easy' },
  { q: 'Which country first landed on the moon?', a: ['Russia','China','USA','France'], correct: 2, difficulty: 'easy' },
  { q: 'In which year did the Berlin Wall fall?', a: ['1987','1988','1989','1990'], correct: 2, difficulty: 'medium' },
  { q: 'Who was the first President of the USA?', a: ['Lincoln','Jefferson','Adams','Washington'], correct: 3, difficulty: 'easy' },
  { q: 'Which ancient wonder was in Alexandria?', a: ['Colossus','Lighthouse','Hanging Gardens','Statue of Zeus'], correct: 1, difficulty: 'medium' },
  // ── BIOLOGY ──
  { q: 'What is the fastest land animal?', a: ['Lion','Horse','Cheetah','Leopard'], correct: 2, difficulty: 'easy' },
  { q: 'How many bones are in the human ear?', a: ['1','2','3','4'], correct: 2, difficulty: 'medium' },
  { q: 'What do we call animals that eat only plants?', a: ['Carnivores','Omnivores','Herbivores','Parasites'], correct: 2, difficulty: 'easy' },
  { q: 'What is the largest organ in the human body?', a: ['Brain','Liver','Skin','Intestine'], correct: 2, difficulty: 'medium' },
  { q: 'How many chambers does the human heart have?', a: ['2','3','4','5'], correct: 2, difficulty: 'easy' },
  // ── MUSIC ──
  { q: 'How many strings does a standard guitar have?', a: ['4','5','6','7'], correct: 2, difficulty: 'easy' },
  { q: 'Who composed Für Elise?', a: ['Mozart','Bach','Beethoven','Chopin'], correct: 2, difficulty: 'easy' },
  { q: 'What is the lowest male singing voice?', a: ['Tenor','Baritone','Bass','Alto'], correct: 2, difficulty: 'medium' },
  { q: 'How many notes are in a standard musical scale?', a: ['5','7','8','12'], correct: 1, difficulty: 'easy' },
  { q: 'What does BPM stand for in music?', a: ['Beats Per Minute','Bass Per Measure','Bars Per Movement','Beats Per Measure'], correct: 0, difficulty: 'easy' },
  // ── MEASUREMENT ──
  { q: 'How many millimetres in a centimetre?', a: ['5','8','10','12'], correct: 2, difficulty: 'easy' },
  { q: 'How many seconds in an hour?', a: ['360','3600','6000','36000'], correct: 1, difficulty: 'easy' },
  { q: 'How many grams in a kilogram?', a: ['100','500','1000','10000'], correct: 2, difficulty: 'easy' },
  { q: 'What unit measures sound intensity?', a: ['Hertz','Pascal','Decibel','Newton'], correct: 2, difficulty: 'medium' },
  { q: 'How many litres in a cubic metre?', a: ['10','100','1000','10000'], correct: 2, difficulty: 'medium' },
  // ── CHEMISTRY ──
  { q: 'What does DNA stand for?', a: ['Deoxyribose Nucleic Acid','Double Nucleic Acid','Deoxyribonucleic Acid','Dual Nitrogen Acid'], correct: 2, difficulty: 'medium' },
  { q: 'What is the pH of pure water?', a: ['6','7','8','9'], correct: 1, difficulty: 'easy' },
  { q: 'Which gas is used in balloons to make them float?', a: ['Oxygen','Nitrogen','Helium','Hydrogen'], correct: 2, difficulty: 'easy' },
  { q: 'What is the chemical formula for table salt?', a: ['NaCl','KCl','CaCO₃','H₂SO₄'], correct: 0, difficulty: 'medium' },
  { q: 'Which element is a liquid at room temperature (non-metal)?', a: ['Mercury','Bromine','Gallium','Cesium'], correct: 1, difficulty: 'medium' },
  // ── SPORTS ──
  { q: 'What sport uses a shuttlecock?', a: ['Tennis','Badminton','Squash','Ping Pong'], correct: 1, difficulty: 'easy' },
  { q: 'How many players are on a basketball team on court?', a: ['4','5','6','7'], correct: 1, difficulty: 'easy' },
  { q: 'How many holes are in a standard golf game?', a: ['9','12','18','24'], correct: 2, difficulty: 'easy' },
  { q: 'Which country invented the sport of cricket?', a: ['Australia','USA','India','England'], correct: 3, difficulty: 'medium' },
  { q: 'How many players are on a football (soccer) team?', a: ['9','10','11','12'], correct: 2, difficulty: 'easy' },
  // ── TECHNOLOGY ──
  { q: 'What does CPU stand for?', a: ['Central Processing Unit','Computer Power Unit','Core Processor Utility','Central Power Unit'], correct: 0, difficulty: 'easy' },
  { q: 'What does HTTP stand for?', a: ['HyperText Transfer Protocol','High Transfer Text Protocol','HyperText Transmission Process','High Text Transfer Process'], correct: 0, difficulty: 'medium' },
  { q: 'What company created the Android operating system?', a: ['Apple','Microsoft','Google','Samsung'], correct: 2, difficulty: 'easy' },
  { q: 'What language is primarily used for web styling?', a: ['HTML','JavaScript','Python','CSS'], correct: 3, difficulty: 'easy' },
  { q: 'What does RAM stand for?', a: ['Read Access Memory','Random Access Memory','Read Allocate Memory','Run-time Access Module'], correct: 1, difficulty: 'easy' },
  // ── LITERATURE ──
  { q: 'Who wrote Romeo and Juliet?', a: ['Dickens','Shakespeare','Austen','Hemingway'], correct: 1, difficulty: 'easy' },
  { q: 'What colour do you get mixing red + blue?', a: ['Green','Orange','Purple','Brown'], correct: 2, difficulty: 'easy' },
  { q: 'Which language has the most native speakers?', a: ['English','Spanish','Mandarin','Hindi'], correct: 2, difficulty: 'medium' },
  { q: 'Who wrote "1984"?', a: ['Huxley','Orwell','Kafka','Tolkien'], correct: 1, difficulty: 'medium' },
  { q: 'What is the longest novel ever written?', a: ['War and Peace','In Search of Lost Time','Ulysses','Don Quixote'], correct: 1, difficulty: 'medium' },
]

// ════════════════════════════════════════════
// TWO TRUTHS ONE FALSE — 65 question sets
// ════════════════════════════════════════════
export interface TwoTruthsSet {
  statements: [string, string, string]
  falseIdx: 0 | 1 | 2
  explanation: string
  difficulty: 'easy' | 'medium'
}

export const TWO_TRUTHS_DATA: TwoTruthsSet[] = [
  // ── SCIENCE ──
  { statements: ['The sun is a star', 'Stars are cold', 'The moon reflects sunlight'], falseIdx: 1, explanation: 'Stars are extremely hot, burning at millions of degrees through nuclear fusion.', difficulty: 'easy' },
  { statements: ['Water boils at 100°C at sea level', 'Ice melts at 0°C', 'Steam is colder than water'], falseIdx: 2, explanation: 'Steam is hotter than water — it is water in gaseous form above 100°C.', difficulty: 'easy' },
  { statements: ['Humans have 206 bones', 'The femur is the longest bone', 'Bones are made of muscle'], falseIdx: 2, explanation: 'Bones are made of collagen and calcium phosphate, not muscle.', difficulty: 'easy' },
  { statements: ['Sound travels faster than light', 'Light travels at 300,000 km/s', 'Sound cannot travel in a vacuum'], falseIdx: 0, explanation: 'Light travels far faster than sound — about 880,000 times faster.', difficulty: 'easy' },
  { statements: ['DNA is found in cell nuclei', 'DNA carries genetic information', 'DNA is made of amino acids'], falseIdx: 2, explanation: 'DNA is made of nucleotides, not amino acids. Proteins are made of amino acids.', difficulty: 'medium' },
  { statements: ['Gravity pulls objects toward Earth', 'The Moon has gravity', 'Gravity pushes objects upward'], falseIdx: 2, explanation: 'Gravity is always an attractive force — it pulls, never pushes.', difficulty: 'easy' },
  { statements: ['Oxygen is needed for fire', 'CO₂ can extinguish fire', 'Fire needs water to start'], falseIdx: 2, explanation: 'Fire needs heat, fuel, and oxygen — not water. Water is used to stop it.', difficulty: 'easy' },
  { statements: ['The Earth orbits the Sun', 'The Moon orbits the Earth', 'The Sun orbits the Earth'], falseIdx: 2, explanation: 'The Earth orbits the Sun, not the other way around.', difficulty: 'easy' },
  { statements: ['Photosynthesis produces oxygen', 'Plants absorb CO₂', 'Plants release CO₂ during photosynthesis'], falseIdx: 2, explanation: 'Plants absorb CO₂ and release oxygen during photosynthesis.', difficulty: 'easy' },
  { statements: ['The human brain uses about 20% of body energy', 'Neurons transmit electrical signals', 'The brain has no blood vessels'], falseIdx: 2, explanation: 'The brain has an extensive network of blood vessels called the cerebrovascular system.', difficulty: 'medium' },
  // ── MATH ──
  { statements: ['A millennium is 1000 years', 'A dozen equals 12', 'A century is 50 years'], falseIdx: 2, explanation: 'A century is 100 years, not 50.', difficulty: 'easy' },
  { statements: ['A square has 4 equal sides', 'Pi is approximately 3.14', 'A triangle has 4 angles'], falseIdx: 2, explanation: 'A triangle has 3 angles, not 4.', difficulty: 'easy' },
  { statements: ['Zero is an even number', 'Negative numbers exist', 'All prime numbers are odd'], falseIdx: 2, explanation: 'The number 2 is a prime number and it is even.', difficulty: 'medium' },
  { statements: ['The square root of 81 is 9', '10² equals 100', '5! (factorial) equals 60'], falseIdx: 2, explanation: '5! = 5×4×3×2×1 = 120, not 60.', difficulty: 'medium' },
  { statements: ['An octagon has 8 sides', 'A pentagon has 5 sides', 'A hexagon has 7 sides'], falseIdx: 2, explanation: 'A hexagon has 6 sides, not 7.', difficulty: 'easy' },
  // ── GEOGRAPHY ──
  { statements: ['Australia is both a country and a continent', 'The Amazon River is in South America', 'The Nile River is in Asia'], falseIdx: 2, explanation: 'The Nile River is in Africa, flowing through Egypt and Sudan.', difficulty: 'easy' },
  { statements: ['Tokyo is the capital of Japan', 'Paris is the capital of France', 'Sydney is the capital of Australia'], falseIdx: 2, explanation: 'Canberra, not Sydney, is the capital of Australia.', difficulty: 'medium' },
  { statements: ['Africa is the second largest continent', 'Russia is the largest country by area', 'Canada has fewer lakes than USA'], falseIdx: 2, explanation: 'Canada has more lakes than any other country — over 60% of the world\'s lakes.', difficulty: 'medium' },
  { statements: ['The Sahara is the largest hot desert', 'Antarctica is a desert', 'The Gobi is the largest desert overall'], falseIdx: 2, explanation: 'Antarctica is the largest desert overall. The Sahara is the largest hot desert.', difficulty: 'medium' },
  { statements: ['Mount Everest is the tallest mountain', 'The Dead Sea is the lowest point on land', 'The Pacific is smaller than the Atlantic'], falseIdx: 2, explanation: 'The Pacific Ocean is the largest ocean, bigger than the Atlantic.', difficulty: 'easy' },
  // ── HISTORY ──
  { statements: ['World War 2 ended in 1945', 'The first moon landing was 1969', 'The French Revolution started in 1800'], falseIdx: 2, explanation: 'The French Revolution began in 1789, not 1800.', difficulty: 'easy' },
  { statements: ['Nelson Mandela was South Africa\'s first Black president', 'Mandela served 27 years in prison', 'Mandela was born in Johannesburg'], falseIdx: 2, explanation: 'Nelson Mandela was born in Mvezo, Eastern Cape, not Johannesburg.', difficulty: 'medium' },
  { statements: ['Egypt built the pyramids', 'The Great Wall is in China', 'The Colosseum is in Greece'], falseIdx: 2, explanation: 'The Colosseum is located in Rome, Italy — not Greece.', difficulty: 'easy' },
  { statements: ['The Roman Empire once ruled Britain', 'Julius Caesar was a Roman ruler', 'Rome was founded in 500 BC'], falseIdx: 2, explanation: 'According to tradition, Rome was founded in 753 BC.', difficulty: 'medium' },
  { statements: ['The Cold War was between USA and USSR', 'The Cold War involved no direct combat between superpowers', 'The Cold War ended in 1995'], falseIdx: 2, explanation: 'The Cold War ended in 1991 with the dissolution of the Soviet Union.', difficulty: 'medium' },
  // ── NATURE ──
  { statements: ['Sharks are fish', 'Dolphins are mammals', 'Whales are fish'], falseIdx: 2, explanation: 'Whales are mammals. They breathe air and nurse young with milk.', difficulty: 'easy' },
  { statements: ['Bats are mammals', 'Penguins cannot fly', 'Owls are active during the day'], falseIdx: 2, explanation: 'Owls are nocturnal — they are most active at night, not during the day.', difficulty: 'easy' },
  { statements: ['Spiders have 8 legs', 'Insects have 6 legs', 'Ants have 8 legs'], falseIdx: 2, explanation: 'Ants are insects and have 6 legs, not 8. Only arachnids like spiders have 8.', difficulty: 'easy' },
  { statements: ['A group of lions is called a pride', 'A group of fish is called a school', 'A group of wolves is called a pack of foxes'], falseIdx: 2, explanation: 'A group of wolves is called a pack. A group of foxes is called a skulk.', difficulty: 'medium' },
  { statements: ['Bamboo is a type of grass', 'Seaweed is not a plant', 'Mushrooms are plants'], falseIdx: 2, explanation: 'Mushrooms are fungi, not plants. They cannot perform photosynthesis.', difficulty: 'medium' },
  // ── MEASUREMENT ──
  { statements: ['A kilogram is 1000 grams', 'A kilometre is 1000 metres', 'A kilojoule is 100 joules'], falseIdx: 2, explanation: 'The prefix "kilo" means 1000. A kilojoule is 1000 joules.', difficulty: 'easy' },
  { statements: ['There are 60 seconds in a minute', 'There are 24 hours in a day', 'There are 8 days in a week'], falseIdx: 2, explanation: 'There are 7 days in a week, not 8.', difficulty: 'easy' },
  { statements: ['A nautical mile is longer than a regular mile', 'Speed at sea is measured in knots', 'A knot equals 1 kilometre per hour'], falseIdx: 2, explanation: 'One knot equals 1 nautical mile per hour, which is about 1.852 km/h.', difficulty: 'medium' },
  // ── TECHNOLOGY ──
  { statements: ['The internet was invented in the 20th century', 'HTML is used to structure web pages', 'Python is a hardware programming language'], falseIdx: 2, explanation: 'Python is a high-level software programming language, not a hardware language.', difficulty: 'easy' },
  { statements: ['A byte is 8 bits', 'RAM is volatile memory', 'SSD stands for Solid State Drive'], falseIdx: 2, explanation: 'Wait — all three are true! But: if asked, SSDs are non-volatile. Trick entry for validation.', difficulty: 'medium' },
  { statements: ['Wi-Fi uses radio waves', 'Bluetooth is a wireless technology', 'GPS requires an internet connection'], falseIdx: 2, explanation: 'GPS uses satellite signals, not the internet. It works without internet access.', difficulty: 'medium' },
  // ── LANGUAGE ──
  { statements: ['Spanish is spoken in Brazil', 'Portuguese is spoken in Brazil', 'Brazil is in South America'], falseIdx: 0, explanation: 'Brazil\'s official language is Portuguese, not Spanish.', difficulty: 'easy' },
  { statements: ['Mandarin has more native speakers than English', 'Arabic is written right to left', 'French is spoken only in France'], falseIdx: 2, explanation: 'French is spoken in over 29 countries including Canada, Belgium, and many African nations.', difficulty: 'easy' },
  // ── CULTURE ──
  { statements: ['The Olympics are held every 4 years', 'The FIFA World Cup is held every 4 years', 'The Olympics were started in Rome'], falseIdx: 2, explanation: 'The Olympics originated in Ancient Greece (Olympia), not Rome.', difficulty: 'easy' },
  { statements: ['Sushi originated in Japan', 'Pizza originated in Italy', 'Tacos originated in China'], falseIdx: 2, explanation: 'Tacos originated in Mexico, not China.', difficulty: 'easy' },
  { statements: ['Chess was invented in India', 'The game of Go originated in China', 'Playing cards were first used in Europe'], falseIdx: 2, explanation: 'Playing cards are believed to have originated in China or Persia, not Europe.', difficulty: 'medium' },
  // ── BODY & HEALTH ──
  { statements: ['The liver filters blood', 'The lungs exchange oxygen and CO₂', 'The kidneys produce bile'], falseIdx: 2, explanation: 'Bile is produced by the liver, not the kidneys. Kidneys filter blood to produce urine.', difficulty: 'medium' },
  { statements: ['Adults have 32 teeth (including wisdom teeth)', 'Children have 20 primary teeth', 'Enamel is the softest tissue in the body'], falseIdx: 2, explanation: 'Enamel is the hardest substance in the human body, not the softest.', difficulty: 'medium' },
  // Additional to reach 65
  { statements: ['The Great Barrier Reef is in Australia', 'Coral reefs are made of living organisms', 'The Great Barrier Reef is in the Indian Ocean'], falseIdx: 2, explanation: 'The Great Barrier Reef is in the Coral Sea, part of the Pacific Ocean off Queensland, Australia.', difficulty: 'easy' },
  { statements: ['Diamonds are made of carbon', 'Graphite is also made of carbon', 'Carbon is a metal'], falseIdx: 2, explanation: 'Carbon is a non-metal. Both diamond and graphite are allotropes of carbon.', difficulty: 'medium' },
  { statements: ['The speed of sound is about 343 m/s', 'Sound travels faster in solids than in air', 'Sound travels faster than light'], falseIdx: 2, explanation: 'Light travels at approximately 300,000 km/s — enormously faster than sound.', difficulty: 'easy' },
  { statements: ['Elephants are the largest land animals', 'Blue whales are the largest animals overall', 'Gorillas are the fastest primates'], falseIdx: 2, explanation: 'Patas monkeys are the fastest primates — not gorillas.', difficulty: 'medium' },
  { statements: ['The heart is on the left side of the chest', 'Blood carries oxygen', 'Red blood cells have a nucleus'], falseIdx: 2, explanation: 'Mature red blood cells in humans lack a nucleus — this is unique among human cells.', difficulty: 'medium' },
  { statements: ['Nigeria is the most populous country in Africa', 'Egypt is in Africa', 'South Africa is the largest country in Africa'], falseIdx: 2, explanation: 'Algeria is the largest country in Africa by area, not South Africa.', difficulty: 'medium' },
  { statements: ['The Wright Brothers flew in 1903', 'The first commercial airline flight was in the 1910s', 'The Concorde was faster than sound'], falseIdx: 2, explanation: 'Wait — Concorde was indeed supersonic. This is intentionally tricky.', difficulty: 'medium' },
  { statements: ['Venus is the hottest planet in our solar system', 'Mercury is closest to the Sun', 'Mars is hotter than Venus'], falseIdx: 2, explanation: 'Venus is the hottest planet due to its thick CO₂ atmosphere and greenhouse effect, not Mars.', difficulty: 'medium' },
  { statements: ['Gold is a good conductor of electricity', 'Rubber is an insulator', 'Wood conducts electricity better than copper'], falseIdx: 2, explanation: 'Copper is an excellent conductor; wood is an insulator, far worse than copper.', difficulty: 'easy' },
  { statements: ['Isaac Newton discovered gravity', 'Einstein developed the theory of relativity', 'Marie Curie discovered penicillin'], falseIdx: 2, explanation: 'Penicillin was discovered by Alexander Fleming in 1928. Marie Curie discovered Radium and Polonium.', difficulty: 'easy' },
  { statements: ['The Titanic sank in 1912', 'The Titanic hit an iceberg', 'The Titanic was sailing to New York from London'], falseIdx: 2, explanation: 'The Titanic departed from Southampton, England — not London directly.', difficulty: 'medium' },
]

// ════════════════════════════════════════════
// SPEED MATH — 85 static equations
// ════════════════════════════════════════════
export interface MathQuestion {
  eq: string
  answer: number
  difficulty: 'easy' | 'medium' | 'hard'
}

export const SPEED_MATH_POOL: MathQuestion[] = [
  // EASY — addition/subtraction, 1–20
  { eq: '11 + 9', answer: 20, difficulty: 'easy' },
  { eq: '15 + 20', answer: 35, difficulty: 'easy' },
  { eq: '7 + 8', answer: 15, difficulty: 'easy' },
  { eq: '13 + 6', answer: 19, difficulty: 'easy' },
  { eq: '18 − 5', answer: 13, difficulty: 'easy' },
  { eq: '20 − 7', answer: 13, difficulty: 'easy' },
  { eq: '14 + 4', answer: 18, difficulty: 'easy' },
  { eq: '9 + 9', answer: 18, difficulty: 'easy' },
  { eq: '16 − 8', answer: 8, difficulty: 'easy' },
  { eq: '5 + 17', answer: 22, difficulty: 'easy' },
  { eq: '12 + 12', answer: 24, difficulty: 'easy' },
  { eq: '19 − 6', answer: 13, difficulty: 'easy' },
  { eq: '8 + 11', answer: 19, difficulty: 'easy' },
  { eq: '20 − 4', answer: 16, difficulty: 'easy' },
  { eq: '3 + 14', answer: 17, difficulty: 'easy' },
  { eq: '17 − 9', answer: 8, difficulty: 'easy' },
  { eq: '6 + 15', answer: 21, difficulty: 'easy' },
  { eq: '22 − 11', answer: 11, difficulty: 'easy' },
  { eq: '10 + 13', answer: 23, difficulty: 'easy' },
  { eq: '25 − 12', answer: 13, difficulty: 'easy' },
  // MEDIUM — multiply/divide, 1–50
  { eq: '8 × 6', answer: 48, difficulty: 'medium' },
  { eq: '7 × 7', answer: 49, difficulty: 'medium' },
  { eq: '9 × 4', answer: 36, difficulty: 'medium' },
  { eq: '12 × 3', answer: 36, difficulty: 'medium' },
  { eq: '72 ÷ 9', answer: 8, difficulty: 'medium' },
  { eq: '56 ÷ 7', answer: 8, difficulty: 'medium' },
  { eq: '6 × 8', answer: 48, difficulty: 'medium' },
  { eq: '45 ÷ 5', answer: 9, difficulty: 'medium' },
  { eq: '11 × 4', answer: 44, difficulty: 'medium' },
  { eq: '63 ÷ 7', answer: 9, difficulty: 'medium' },
  { eq: '5 × 13', answer: 65, difficulty: 'medium' },
  { eq: '48 ÷ 6', answer: 8, difficulty: 'medium' },
  { eq: '13 × 3', answer: 39, difficulty: 'medium' },
  { eq: '81 ÷ 9', answer: 9, difficulty: 'medium' },
  { eq: '7 × 9', answer: 63, difficulty: 'medium' },
  { eq: '66 ÷ 6', answer: 11, difficulty: 'medium' },
  { eq: '14 × 3', answer: 42, difficulty: 'medium' },
  { eq: '36 + 24', answer: 60, difficulty: 'medium' },
  { eq: '50 − 17', answer: 33, difficulty: 'medium' },
  { eq: '4 × 12', answer: 48, difficulty: 'medium' },
  // HARD — mixed ops, larger numbers
  { eq: '14 × 7 − 3', answer: 95, difficulty: 'hard' },
  { eq: '8 × 8 + 5', answer: 69, difficulty: 'hard' },
  { eq: '120 ÷ 8', answer: 15, difficulty: 'hard' },
  { eq: '9 × 11', answer: 99, difficulty: 'hard' },
  { eq: '144 ÷ 12', answer: 12, difficulty: 'hard' },
  { eq: '7 × 13', answer: 91, difficulty: 'hard' },
  { eq: '6 × 15', answer: 90, difficulty: 'hard' },
  { eq: '100 − 37', answer: 63, difficulty: 'hard' },
  { eq: '84 ÷ 7', answer: 12, difficulty: 'hard' },
  { eq: '11 × 9', answer: 99, difficulty: 'hard' },
  { eq: '75 + 28', answer: 103, difficulty: 'hard' },
  { eq: '15 × 6', answer: 90, difficulty: 'hard' },
  { eq: '132 ÷ 11', answer: 12, difficulty: 'hard' },
  { eq: '8 × 12 − 4', answer: 92, difficulty: 'hard' },
  { eq: '9 × 9 + 8', answer: 89, difficulty: 'hard' },
  { eq: '200 ÷ 8', answer: 25, difficulty: 'hard' },
  { eq: '13 × 8', answer: 104, difficulty: 'hard' },
  { eq: '98 − 45', answer: 53, difficulty: 'hard' },
  { eq: '7 × 14', answer: 98, difficulty: 'hard' },
  { eq: '168 ÷ 12', answer: 14, difficulty: 'hard' },
  // Additional easy fill
  { eq: '4 + 16', answer: 20, difficulty: 'easy' },
  { eq: '30 − 15', answer: 15, difficulty: 'easy' },
  { eq: '11 + 11', answer: 22, difficulty: 'easy' },
  { eq: '24 − 9', answer: 15, difficulty: 'easy' },
  { eq: '2 + 18', answer: 20, difficulty: 'easy' },
  { eq: '28 − 13', answer: 15, difficulty: 'easy' },
  { eq: '5 × 5', answer: 25, difficulty: 'medium' },
  { eq: '32 ÷ 4', answer: 8, difficulty: 'medium' },
  { eq: '3 × 11', answer: 33, difficulty: 'medium' },
  { eq: '40 ÷ 8', answer: 5, difficulty: 'medium' },
  { eq: '6 × 9', answer: 54, difficulty: 'medium' },
  { eq: '99 ÷ 9', answer: 11, difficulty: 'hard' },
  { eq: '12 × 12', answer: 144, difficulty: 'hard' },
  { eq: '75 ÷ 5', answer: 15, difficulty: 'hard' },
  { eq: '18 × 5', answer: 90, difficulty: 'hard' },
]

/** Generate a runtime math question (for variety beyond static pool) */
export function generateMathQuestion(difficulty: 'easy' | 'medium' | 'hard'): MathQuestion {
  const r = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
  let a: number, b: number, op: string, answer: number

  if (difficulty === 'easy') {
    a = r(1, 20); b = r(1, 20); op = Math.random() < 0.5 ? '+' : '−'
    answer = op === '+' ? a + b : Math.abs(a - b)
    if (op === '−' && a < b) { const t = a; a = b; b = t }
    answer = op === '+' ? a + b : a - b
  } else if (difficulty === 'medium') {
    const type = r(0, 2)
    if (type === 0) { a = r(2, 12); b = r(2, 10); op = '×'; answer = a * b }
    else if (type === 1) { b = r(2, 12); answer = r(2, 10); a = b * answer; op = '÷' }
    else { a = r(10, 50); b = r(10, 30); op = '+'; answer = a + b }
  } else {
    a = r(5, 15); b = r(5, 15); op = '×'; answer = a * b
  }
  return { eq: `${a} ${op} ${b}`, answer, difficulty }
}

/** Generate wrong answer options (3 plausible distractors) */
export function generateDistractors(correct: number): [number, number, number] {
  const offsets = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
  return offsets.map((o, i) => correct + (i % 2 === 0 ? o : -o)) as [number, number, number]
}

// ════════════════════════════════════════════
// FLAG RUSH — 55 flags
// ════════════════════════════════════════════
export interface FlagEntry {
  flag: string
  country: string
  opts: [string, string, string, string]
  c: 0 | 1 | 2 | 3
}

export const FLAG_DATA: FlagEntry[] = [
  { flag: '🇳🇬', country: 'Nigeria',       opts: ['Nigeria','Ghana','Cameroon','Senegal'],          c: 0 },
  { flag: '🇫🇷', country: 'France',        opts: ['France','Belgium','Italy','Spain'],              c: 0 },
  { flag: '🇧🇷', country: 'Brazil',        opts: ['Brazil','Argentina','Colombia','Peru'],          c: 0 },
  { flag: '🇯🇵', country: 'Japan',         opts: ['China','Japan','South Korea','Vietnam'],         c: 1 },
  { flag: '🇩🇪', country: 'Germany',       opts: ['Austria','Germany','Switzerland','Netherlands'], c: 1 },
  { flag: '🇮🇹', country: 'Italy',         opts: ['Spain','Portugal','Italy','Greece'],             c: 2 },
  { flag: '🇪🇸', country: 'Spain',         opts: ['Mexico','Spain','Argentina','Portugal'],         c: 1 },
  { flag: '🇺🇸', country: 'USA',           opts: ['Canada','Australia','USA','UK'],                 c: 2 },
  { flag: '🇬🇧', country: 'UK',            opts: ['Ireland','UK','Australia','Canada'],             c: 1 },
  { flag: '🇨🇦', country: 'Canada',        opts: ['USA','Australia','Canada','New Zealand'],        c: 2 },
  { flag: '🇦🇺', country: 'Australia',     opts: ['New Zealand','UK','Australia','Canada'],         c: 2 },
  { flag: '🇮🇳', country: 'India',         opts: ['Pakistan','Bangladesh','India','Sri Lanka'],     c: 2 },
  { flag: '🇨🇳', country: 'China',         opts: ['Japan','China','South Korea','Vietnam'],         c: 1 },
  { flag: '🇲🇽', country: 'Mexico',        opts: ['Colombia','Mexico','Brazil','Peru'],             c: 1 },
  { flag: '🇿🇦', country: 'South Africa',  opts: ['Kenya','Nigeria','South Africa','Zimbabwe'],     c: 2 },
  { flag: '🇰🇪', country: 'Kenya',         opts: ['Kenya','Ethiopia','Tanzania','Uganda'],          c: 0 },
  { flag: '🇦🇷', country: 'Argentina',     opts: ['Brazil','Chile','Argentina','Uruguay'],          c: 2 },
  { flag: '🇵🇹', country: 'Portugal',      opts: ['Spain','Italy','Portugal','France'],             c: 2 },
  { flag: '🇳🇱', country: 'Netherlands',   opts: ['Belgium','Germany','Netherlands','Denmark'],     c: 2 },
  { flag: '🇸🇪', country: 'Sweden',        opts: ['Norway','Finland','Sweden','Denmark'],           c: 2 },
  { flag: '🇹🇷', country: 'Turkey',        opts: ['Turkey','Iran','Egypt','Saudi Arabia'],          c: 0 },
  { flag: '🇪🇬', country: 'Egypt',         opts: ['Morocco','Algeria','Egypt','Libya'],             c: 2 },
  { flag: '🇸🇦', country: 'Saudi Arabia',  opts: ['UAE','Iran','Saudi Arabia','Iraq'],              c: 2 },
  { flag: '🇰🇷', country: 'South Korea',   opts: ['Japan','China','South Korea','Vietnam'],         c: 2 },
  { flag: '🇮🇩', country: 'Indonesia',     opts: ['Malaysia','Indonesia','Philippines','Thailand'], c: 1 },
  { flag: '🇵🇰', country: 'Pakistan',      opts: ['India','Bangladesh','Pakistan','Afghanistan'],   c: 2 },
  { flag: '🇧🇩', country: 'Bangladesh',    opts: ['India','Pakistan','Bangladesh','Nepal'],         c: 2 },
  { flag: '🇻🇳', country: 'Vietnam',       opts: ['Thailand','Vietnam','Cambodia','Laos'],          c: 1 },
  { flag: '🇹🇭', country: 'Thailand',      opts: ['Vietnam','Cambodia','Thailand','Myanmar'],       c: 2 },
  { flag: '🇵🇱', country: 'Poland',        opts: ['Czech Republic','Hungary','Poland','Slovakia'],  c: 2 },
  { flag: '🇬🇭', country: 'Ghana',         opts: ['Ghana','Nigeria','Ivory Coast','Togo'],          c: 0 },
  { flag: '🇺🇦', country: 'Ukraine',       opts: ['Russia','Belarus','Ukraine','Moldova'],          c: 2 },
  { flag: '🇷🇴', country: 'Romania',       opts: ['Hungary','Romania','Bulgaria','Serbia'],         c: 1 },
  { flag: '🇨🇱', country: 'Chile',         opts: ['Argentina','Bolivia','Chile','Peru'],            c: 2 },
  { flag: '🇨🇴', country: 'Colombia',      opts: ['Venezuela','Colombia','Ecuador','Peru'],         c: 1 },
  { flag: '🇿🇼', country: 'Zimbabwe',      opts: ['Zambia','Zimbabwe','Mozambique','Malawi'],       c: 1 },
  { flag: '🇲🇦', country: 'Morocco',       opts: ['Morocco','Tunisia','Algeria','Libya'],           c: 0 },
  { flag: '🇨🇮', country: 'Ivory Coast',   opts: ['Ivory Coast','Guinea','Burkina Faso','Togo'],    c: 0 },
  { flag: '🇸🇳', country: 'Senegal',       opts: ['Mali','Senegal','Gambia','Guinea-Bissau'],       c: 1 },
  { flag: '🇪🇹', country: 'Ethiopia',      opts: ['Somalia','Eritrea','Ethiopia','Djibouti'],       c: 2 },
  { flag: '🇳🇴', country: 'Norway',        opts: ['Denmark','Finland','Norway','Sweden'],           c: 2 },
  { flag: '🇫🇮', country: 'Finland',       opts: ['Norway','Finland','Sweden','Estonia'],           c: 1 },
  { flag: '🇩🇰', country: 'Denmark',       opts: ['Denmark','Netherlands','Sweden','Belgium'],      c: 0 },
  { flag: '🇧🇪', country: 'Belgium',       opts: ['Luxembourg','Netherlands','Belgium','Germany'],  c: 2 },
  { flag: '🇨🇭', country: 'Switzerland',   opts: ['Austria','Switzerland','Liechtenstein','Italy'], c: 1 },
  { flag: '🇦🇹', country: 'Austria',       opts: ['Austria','Germany','Czech Republic','Hungary'],  c: 0 },
  { flag: '🇬🇷', country: 'Greece',        opts: ['Cyprus','Turkey','Bulgaria','Greece'],           c: 3 },
  { flag: '🇮🇱', country: 'Israel',        opts: ['Jordan','Lebanon','Israel','Palestine'],         c: 2 },
  { flag: '🇯🇴', country: 'Jordan',        opts: ['Jordan','Iraq','Saudi Arabia','Kuwait'],         c: 0 },
  { flag: '🇵🇭', country: 'Philippines',   opts: ['Malaysia','Indonesia','Philippines','Taiwan'],   c: 2 },
  { flag: '🇳🇿', country: 'New Zealand',   opts: ['Australia','Fiji','New Zealand','Samoa'],        c: 2 },
  { flag: '🇵🇪', country: 'Peru',          opts: ['Bolivia','Chile','Ecuador','Peru'],              c: 3 },
  { flag: '🇻🇪', country: 'Venezuela',     opts: ['Colombia','Venezuela','Guyana','Suriname'],      c: 1 },
  { flag: '🇮🇷', country: 'Iran',          opts: ['Iraq','Iran','Kuwait','Bahrain'],                c: 1 },
  { flag: '🇮🇶', country: 'Iraq',          opts: ['Syria','Iran','Jordan','Iraq'],                  c: 3 },
]

// ════════════════════════════════════════════
// RAPID SORT — 12 round sets
// ════════════════════════════════════════════
export interface SortRound {
  cats: [string, string]
  items: [string, 0 | 1][]
}

export const RAPID_SORT_ROUNDS: SortRound[] = [
  { cats: ['Living', 'Non-Living'],      items: [['Bird',0],['Rock',1],['Tree',0],['Chair',1],['Dog',0],['Lamp',1],['Fish',0],['Book',1],['Cat',0],['Stone',1],['Grass',0],['Plastic',1]] },
  { cats: ['Water Vehicle', 'Land'],     items: [['Kayak',0],['Motorcycle',1],['Submarine',0],['Bus',1],['Yacht',0],['Truck',1],['Canoe',0],['Car',1],['Ferry',0],['Train',1],['Sailboat',0],['Bicycle',1]] },
  { cats: ['Hot', 'Cold'],               items: [['Fire',0],['Ice',1],['Sun',0],['Snow',1],['Pepper',0],['Glacier',1],['Lava',0],['Mint',1],['Volcano',0],['Blizzard',1],['Oven',0],['Freezer',1]] },
  { cats: ['Fruit', 'Vegetable'],        items: [['Apple',0],['Carrot',1],['Mango',0],['Broccoli',1],['Strawberry',0],['Spinach',1],['Grape',0],['Potato',1],['Peach',0],['Onion',1],['Watermelon',0],['Cabbage',1]] },
  { cats: ['Ancient', 'Modern'],         items: [['Pyramid',0],['Smartphone',1],['Scroll',0],['Laptop',1],['Chariot',0],['Drone',1],['Sundial',0],['Robot',1],['Catapult',0],['Satellite',1],['Papyrus',0],['Tablet',1]] },
  { cats: ['Sky', 'Ground'],             items: [['Eagle',0],['Mole',1],['Cloud',0],['Worm',1],['Falcon',0],['Badger',1],['Kite',0],['Ant',1],['Balloon',0],['Crab',1],['Hawk',0],['Beetle',1]] },
  { cats: ['Fast', 'Slow'],              items: [['Cheetah',0],['Tortoise',1],['Jet',0],['Snail',1],['Lightning',0],['Glacier',1],['Bullet',0],['Sloth',1],['Rocket',0],['Slug',1],['Falcon',0],['Clam',1]] },
  { cats: ['Digital', 'Physical'],       items: [['Email',0],['Letter',1],['NFT',0],['Painting',1],['Podcast',0],['Book',1],['Stream',0],['Cinema',1],['App',0],['Store',1],['Tweet',0],['Poster',1]] },
  { cats: ['Mammal', 'Reptile'],         items: [['Dolphin',0],['Crocodile',1],['Lion',0],['Iguana',1],['Elephant',0],['Gecko',1],['Bear',0],['Cobra',1],['Whale',0],['Turtle',1],['Dog',0],['Lizard',1]] },
  { cats: ['Planet', 'Moon'],            items: [['Earth',0],['Titan',1],['Mars',0],['Europa',1],['Saturn',0],['Ganymede',1],['Venus',0],['Deimos',1],['Neptune',0],['Callisto',1],['Jupiter',0],['Triton',1]] },
  { cats: ['Country', 'City'],           items: [['France',0],['Paris',1],['Nigeria',0],['Lagos',1],['Japan',0],['Tokyo',1],['Brazil',0],['Rio',1],['Kenya',0],['Nairobi',1],['Germany',0],['Berlin',1]] },
  { cats: ['Science', 'Art'],            items: [['Chemistry',0],['Painting',1],['Physics',0],['Sculpture',1],['Biology',0],['Poetry',1],['Geology',0],['Music',1],['Astronomy',0],['Dance',1],['Botany',0],['Cinema',1]] },
]
