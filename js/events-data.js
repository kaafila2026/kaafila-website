// Kaafila 2026 — shared event data.
// This is the single source of truth for the Events hub, the four category
// pages, and the event detail page. Every page that lists or links to an
// event reads from this file, so nothing else needs to change.
//
// title/subtitle/description/guidelines/criteria are taken verbatim from
// the official Kaafila26 storytelling brochures (concept notes) and the
// General Guidelines document (guidelines + judgement criteria); kept here
// as plain-text data even though the event page displays page *images*
// (see below), since it's still useful as image alt text and a future
// text fallback. description holds multiple paragraphs separated by
// "\n\n". Fields are omitted where the source document has nothing for
// that event (e.g. no judging criteria for a workshop).
//
// The Concept Note and Guidelines boxes on the event page actually render
// cropped page images from the source PDFs (img/concept-notes/<id>.jpg,
// one page per event; img/guidelines/<id>-N.jpg, guidelinesPageCount pages
// per event, defaulting to 1 when omitted) so they look exactly like the
// brochures, rather than reflowed text.
// poster: leave as null until real artwork exists.
// guidelinesPdf: the event's official "Guidelines and Judgement Criteria"
// document link from the brochure, kept as a reference alongside the
// page images above.
// Plain script (not a module) so it also works when pages are opened
// directly from disk via file://, where module scripts are blocked by CORS.

// The two registration forms, printed on page 11 of both brochures. There is
// no per-event form — every competitive event shares one, every
// non-competitive event the other, so an event's `competitive` flag decides
// which link its Register button points at.
const KAAFILA_REGISTRATION = {
  competitive: "https://forms.gle/cvw39Gooi9bdoyqy7",
  nonCompetitive: "https://forms.gle/tuHoiUMcfXBRVMm79"
};

// Ticketed events, open to Shiv Nadar School Noida students only.
//
// ticketLink: paste the booking URL here when it exists. Until then the page
// says so rather than showing a dead button.
//
// The campus letter is the filter. Every Shiv Nadar School admission number
// carries one — N for Noida, G for Gurgaon — so matching it on `campus` is
// what makes this a Noida-only check, and a Gurgaon number is turned away
// even though it is a perfectly real admission number.
//
// The year and serial are only checked for shape, deliberately loosely: a
// real Noida student must never be turned away because their serial ran to an
// unusual length. Tightening those adds nothing the campus letter doesn't
// already do.
//
// THIS IS A DETERRENT, NOT SECURITY. The rule sits in JavaScript the browser
// downloads, so anyone who opens devtools can read it and craft a number that
// passes, and anyone given the booking URL can use it directly. It keeps
// casual outsiders and made-up numbers out; it will not stop someone who
// actually wants in. If real restriction is needed, the booking form itself
// has to check identity server-side — a static site cannot.
const KAAFILA_TICKETS = {
  ticketLink: "https://konfhub.com/kaafila-2026-integrated-arts-festival-by-shiv-nadar-school-noida",
  admissionPattern: /^SNS\/([A-Z])\/(\d{2})\/(\d{1,5})$/,
  campus: "N",
  events: [
    {
      name: "Headline Act",
      featuring: "Darzi",
      when: "18th August, 03:45 PM – 04:45 PM · WCH",
      blurb: "An electrifying performance that turns art into an experience — renowned artists, comedians, storytellers and performers, exclusively for Shiv Nadar School students. Always one of the most awaited of the festival: it's where the auditorium becomes a memory."
    },
    {
      name: "Shaam-e-Rang",
      featuring: "Mukhtiyar Ali",
      when: "19th August, 05:30 PM – 06:30 PM · WCH",
      blurb: "Parents Night — a Sufi evening thanking our parents for their unwavering support, with soulful cultural performances by renowned artists like Mir Ali Basu. An evening where art, gratitude and joy come together, and a small gift to our biggest supporters."
    },
    {
      name: "Clash of Bands",
      featuring: "(ticketed competition)",
      when: "20th August, 03:30 PM – 05:30 PM · WCH",
      blurb: "A showcase of passion and musical talent, where school bands step into the spotlight to make music that doesn't just entertain, but moves. The festival's closing competition, and one of its loudest rooms."
    },
    {
      name: "One Act Play",
      featuring: "(ticketed competition)",
      when: "18th August, 09:45 AM – 12:30 PM · WCH",
      blurb: "As You Weave It! — student teams stage original work on the threads that bind us: empathy, resilience, belonging. Five teams, twenty-five minutes each, from an empty stage to an empty stage. A discussion with the teams follows at 12:30 PM in Collab Room 1."
    }
  ]
};

const KAAFILA_CATEGORIES = {
  music:   { label: "Music", themed: "Strings Attached",        page: "music.html",         thread: "#8b4441", tagline: "Explore the music events of Kaafila" },
  dance:   { label: "Dance", themed: "Rhythmic Ringers",        page: "dance.html",         thread: "#e0993d", tagline: "Explore the dance events of Kaafila" },
  visual:  { label: "Visual Arts", themed: "Iridescence",  page: "visual-arts.html",   thread: "#5c7a63", tagline: "Explore the visual arts events of Kaafila" },
  theatre: { label: "Theatre", themed: "Bread & Circuses",      page: "theatre.html",       thread: "#4a3428", tagline: "Explore the theatre events of Kaafila" }
};

const KAAFILA_EVENTS = [
  {
    id: "clash-of-bands",
    title: "Clash of Bands",
    subtitle: "Rock Band",
    category: "music",
    competitive: true,
    date: "20th August",
    venue: "WCH, 03:30 PM – 05:30 PM",
    description: "Clash of Bands is a showcase of passion and musical talent put together! A celebration of youth voice and creative boldness, the event invites school bands to step into the spotlight and make music that doesn’t just entertain, but moves. In a world where we’re constantly surrounded by noise, Clash of Bands asks you to create moments that cut through, one that makes people pause, feel, and remember.\n\nThis year’s theme, “ताना बाना: The Timelessness of Humanity,” encourages bands to explore the idea of humanity without borders. It asks for community in times of divide, and it pushes for togetherness when there seem to be a million things pulling us apart. The theme runs on the ideas of unity and community support, where we try and look at our common humanity as the thread that brings us together in times of crisis. Today, we live in a world where the notion of global togetherness and cooperation seems utopian, almost laughable- and that in itself tells us what we need to know about just how far apart we are. This year, Kaafila tries to bridge that gap between vastly different individuals, arguing that the only basis for connection we truly need is our shared identities as human beings.\n\nYou’re not just playing to win - you’re playing to awaken. The best performances are the ones that have a lasting impact. This is your moment to be daring, to be real, to turn chords into confessions and rhythm into rebellion. So bring your voice, bring your truth, and make us feel every beat of what it means to live.",
    guidelines: [
      "A maximum of 6 teams will be permitted into the competition. Open to students from Grades 9-12.",
      "To be considered for the competition, all enrolled teams must submit a 2 minute preliminary practice video where all band members are visible, performing one of their chosen songs for the competition. Additionally, they need to write a brief concept explaining how their song is connected to the theme. This written concept should be attached to the submission form along with the video.",
      "The participating team must consist of a minimum of 5 and a maximum of 8 members.",
      "All teams must include at least 1 vocalist.",
      "Teams are allotted a total of 15 minutes for their performance, including stage entry, set-up, performance itself, and stage exit. Please note that teachers are not allowed to be on the stage during the set-up. If the performance exceeds 15 minutes, marks will be deducted for every additional second up till 2 minutes. If the total time exceeds 17 minutes, the band will be disqualified.",
      "Teams are free to select music for any genre they choose but should ensure their selection aligns with the theme of the festival.",
      "Following each performance, it is the responsibility of the participating team to clear the stage.",
      "Each performing participant will be provided with: a 61-key keyboard, 5 piece acoustic drum set, 1 bass guitar amp, 2 electric guitar amps, 4 standing mics and 2 cordless, 2 side fills and 4 monitors.",
      "Note: apart from the equipment and facilities provided by the organisers, participants are responsible for bringing any additional items they may require for the performance.",
      "Usage of profanity is strictly prohibited, performing songs containing the same can lead to disqualification from the competition.",
      "The use of backing tracks for accompaniment is strictly prohibited. All musical elements must be performed live by the team members.",
      "Preliminary Round: to be considered, all enrolled teams must submit a 2 minute video, as an unlisted video on Youtube, where all band members are visible, performing one of their chosen songs for the competition. The form will be kept open till 5th August, giving all participants enough time to prepare.",
      "Please note that the host school will not be participating as a competitor in any event this year."
    ],
    criteria: ["Theme adherence", "Command over instrument", "Originality", "Showmanship", "Overall synchronization", "Interpretation and arrangement", "Musicality", "Vocal performance"],
    guidelinesPageCount: 2,
    poster: "img/posters/clash-of-bands.jpg",
    guidelinesPdf: "https://drive.google.com/file/d/1yrU0EGDXXtANg6eOXbTlvV1pNiXrISvH/view?usp=drive_link"
  },
  {
    id: "hindustani-vocal-competition",
    title: "Naad Sutra",
    subtitle: "Hindustani Vocal",
    category: "music",
    competitive: true,
    date: "18th August",
    venue: "IC MPH, 10:00 AM – 12:00 PM",
    description: "Svarsangam is a soulful celebration where students from across schools gather to honour the timeless beauty of Hindustani Classical music. Influenced by nature, poetry, and deep-rooted philosophy, this genre was born as a meditative art - one that transforms raw emotion into melody. In a time when we often lose ourselves to the constant flicker of screens, Hindustani music reminds us of our own stillness. It speaks to the soul in a language more ancient and profound than words, grounding us in something real and deeply human.\n\nParticipants will be expected to choose ragas that resonate with their fellow humanity, that reflects this year’s Kaafila theme, “ताना बाना : The Timelessness of Humanity.” We invite performers to think of their compositions as stories; filled with soulful melodies that incorporate the ideas of togetherness within humanity. In a world constantly divided and forced further apart, art and especially music stand as common unifiers for people. Along these lines, we invite you as artists to sing and feel deep within your art the truth about all of us- that we are a community, united in our differences, brought together through art and expression. Feel free to incorporate subtle poetic references or improvise within the structure of your raga to make it your own.\n\nThis is more than a competition. It's a revival. It’s your moment to take a tradition centuries old and breathe new meaning into it with your voice. As your notes rise and fall, remember: you are not just singing, you are creating moments of stillness in a world that rarely pauses.",
    guidelines: [
      "A maximum of 1 team per school is permitted within the competition.",
      "Each team must consist of a minimum of 5 members, and a maximum of 8 members. Each member must sing and participate equally, and 100% from each member is required.",
      "The duration of the entire team’s participation must range from within 5-6 minutes.",
      "Each team is required to prepare and perform an original Bandish (chota khayal in any taal) incorporating both Alap and Taan within a raga of their choice.",
      "Participants must maintain the integrity of the Raga.",
      "A maximum of 2 accompanists are permitted for every team.",
      "Allowed accompaniment instruments include: Manual Harmonium, Tabla (percussion instrument), and either a manual tanpura or an electronic tanpura for providing the tonal base.",
      "Please note that the host school will not be participating as a competitor in any event this year."
    ],
    criteria: ["Raag Gyan (based note application)", "Taal Gyan", "Bandish Gyan", "Alaap and taan", "Overall participation and coordination"],
    poster: "img/posters/hindustani-vocal-competition.jpg",
    guidelinesPdf: "https://drive.google.com/file/d/12vXpMUw_388H3ElhRujCIR2DhZe3QAh2/view?usp=drive_link"
  },
  {
    id: "beat-beyond-borders",
    title: "Beat Beyond Borders",
    subtitle: "Beatboxing Workshop",
    category: "music",
    competitive: false,
    date: "20th August",
    venue: "IC Music Studio, 10:00 AM – 11:00 AM",
    description: "Throughout the course of history, through the rise and fall of so many empires scattered across the world, the emergence of music marked a significant development in the arts. As centuries have passed, different music styles have also emerged- blues in the 1880s, rock n’ roll in the 1940s, and beatboxing in the 1970s.\n\nBeatboxing in particular is a form of music that employs vocal techniques that imitate the sound of drum machines using one’s mouth, lips, tongue, throat, and voice. Emerging when the Roland TR-808 was released, followed by its successor the Roland TR-909, beatboxing quickly gained popularity when people began imitating the machines’ sounds using their mouths. The first people who began practicing this art form were “The Fat Boys,” an iconic band at the time. Today, New School Beatboxing has become a medium of self expression which employs many vaster forms and techniques that further the art’s scope.\n\nLed by popular beatboxer Kunal Grover, this year at Kaafila, we invite you to attend a workshop where you will learn the basics of this iconic art form. Join us for an unforgettable experience, a novel event in Kaafila history here at Shiv Nadar School. Let’s broaden our understanding of music beyond the conventional, and immerse ourselves in the vast world of this beautiful art form!",
    guidelines: [
      "A maximum of 20 people are allowed within the workshop, and it is open to anyone from Grades 7-12.",
      "Seats will be allocated on a first come, first serve basis.",
      "No prior knowledge about beatboxing is required to attend the workshop - it is completely beginner-friendly.",
      "Please be respectful to the facilitator and your fellow participants - remember, this is everybody’s first time trying out a new art form and may take a while to master.",
      "Please be ready to interact with the facilitator and the workshop participants, as beatboxing is an art form that can only be mastered with practice and immersion."
    ],
    poster: "img/posters/beat-beyond-borders.jpg",
    guidelinesPdf: "https://drive.google.com/file/d/1Gc89N-XH9awulexkq9y6FKYRomAJrs-T/view?usp=drive_link"
  },
  {
    id: "classical-solo-dance-competition",
    title: "Anugoonj",
    subtitle: "Classical Solo Dance",
    category: "dance",
    competitive: true,
    date: "20th August",
    venue: "WCH, 09:00 AM – 10:00 AM",
    description: "Every tradition begins with an individual who chooses to preserve it. Passed down through generations, classical and folk dance forms have survived not only through technique, but through the countless artists who have carried them forward with dedication and pride. Each solo performance is therefore more than an individual showcase—it is a continuation of a story that has travelled across time.\n\nIn the spirit of ताना-बाना: The Timelessness of Humanity, the Solo Dance Competition celebrates the unique thread that every individual adds to the larger fabric of humanity. Rooted in traditional dance forms, participants are invited to embody the history, emotion, and cultural legacy that their art represents, while allowing their own interpretation to shine through.\n\nThough each dancer stands alone on stage, they are never truly alone. Every movement echoes the footsteps of those who came before them, reminding us that tradition is not something left behind—it is something we carry with us. In every performance lies the power to preserve the past, embrace the present, and inspire the future, one step at a time.",
    guidelines: [
      "A maximum of one pair entry will be allowed from each school.",
      "Out of all the applications received, only 12 applicants will be filtered out by the teacher anchors.",
      "The duration of the performance must be a minimum of 3 minutes and a maximum of 5 minutes.",
      "Participants must perform to traditional music and wear traditional attire appropriate to the chosen dance form, while adhering to their school's code of conduct.",
      "A Google form will be shared with registered participants to note down their needs, and confirmations of available support will be given out accordingly.",
      "The backing track/audio for the performance must be emailed at the time of registration.",
      "The performance must be presented strictly on pre-recorded music. No live accompaniment or accompanying artists will be permitted.",
      "All participants must arrive at the venue fully dressed and performance-ready from their respective schools. Changing facilities will not be provided at the venue.",
      "The performance time will commence once the backing track begins or the live narration starts, whichever is earlier.",
      "Participants will be disqualified or lose points if: the songs have explicit or derogatory lyrics or are inappropriate; or they exceed the time limit.",
      "Preliminary round: the participants are required to submit a recording, as a link, of their final dance piece at the time of registration. The form will be kept open till 7th August. The preliminary round panellists will be external judges to ensure no conflict of interest. All schools, whether accepted or not, will get an email confirming whether they passed the preliminary round or not by 14th August.",
      "Please note that the host school will not be participating as a competitor in any event this year."
    ],
    guidelinesPageCount: 2,
    poster: "img/posters/classical-solo-dance-competition.jpg",
    guidelinesPdf: "https://drive.google.com/file/d/1Vad12Z53BkocgCgzoHCqEBvf8w9x8CEu/view?usp=drive_link"
  },
  {
    id: "souls-in-sync",
    title: "Weave the Beat",
    subtitle: "Western Group Dance",
    category: "dance",
    competitive: true,
    date: "20th August",
    venue: "WCH, 10:00 AM – 12:00 PM",
    description: "Across cultures and generations, people have always found ways to move together. Whether in celebration, resistance, or remembrance, collective dance has long served as a reminder that humanity is strongest when it moves in harmony.\n\nIn the spirit of ताना-बाना: The Timelessness of Humanity, the Western Group Dance Competition celebrates the beauty of many individuals coming together to create a single, powerful expression. Every dancer brings their own rhythm, style, and perspective to the stage, yet it is through trust, synchronisation, and shared purpose that these differences are woven into one compelling performance.\n\nFrom the precision of Jazz to the energy of Hip Hop, the fluidity of Contemporary, and the creativity of Freestyle, each performance becomes a tapestry of movement where individuality is not lost but strengthened through collaboration. Every formation, transition, and beat is another thread woven into a larger story—one that reminds us that while we may move differently, we are united by the universal language of dance.",
    guidelines: [
      "A maximum of one team will be accepted from each school.",
      "Dance forms such as Jazz, Hip Hop, Western Contemporary, and Freestyle are permitted.",
      "Each team must consist of a minimum of 6 and a maximum of 10 participants.",
      "The duration of the performance must be a minimum of 4 minutes and a maximum of 6 minutes.",
      "The backing track/audio for the performance must be emailed at the time of registration.",
      "All participants must arrive at the venue fully dressed and performance-ready from their respective schools. Changing facilities will not be provided at the venue.",
      "The performance time will commence once the backing track begins or the live narration starts, whichever is earlier.",
      "Teams will be disqualified if: the music contains explicit, offensive, or derogatory lyrics; the performance exceeds the prescribed time limit; or the team exceeds the maximum or falls below the minimum number of participants.",
      "Please note that the host school will not be participating as a competitor in any event this year."
    ],
    criteria: ["Costumes", "Concept and Creativity", "Choreography", "Synchronisation", "Expression", "Balance and Rhythm", "Music Selection and Interpretation"],
    poster: "img/posters/souls-in-sync.jpg",
    guidelinesPdf: "https://drive.google.com/file/d/1OWiF036tGQU2-Nqn8p3kD7slj9wKu97i/view?usp=drive_link"
  },
  {
    id: "jazz-workshop",
    title: "Rhythm Loom",
    subtitle: "Contemporary Dance Workshop",
    category: "dance",
    competitive: false,
    date: "18th August",
    venue: "Middle Block Dance Room, Room 101+102, 10:00 AM – 12:00 PM",
    description: "A tapestry is never woven from a single thread. It is shaped by colours that contrast, textures that differ, and strands that cross paths to create something neither could become alone. Dance, too, follows the same rhythm. Every style carries its own voice, but when they meet, they begin a new conversation.\n\nIn the spirit of ताना-बाना: The Timelessness of Humanity, this workshop brings together Jazz, Hip Hop, and Contemporary—three distinct styles, each with its own character, history, and movement vocabulary. Rather than existing in isolation, they intertwine, borrowing from one another to create a shared language that is both diverse and unified.\n\nThis workshop is an invitation to explore what happens when differences are embraced rather than separated. As participants move through styles, exchange ideas, and create together, they become threads in the same weave—discovering that the most compelling expressions are often born where individuality meets collaboration.",
    guidelines: [
      "The duration of the workshop is 2 hours.",
      "This workshop can be attended by dancers of any skill level.",
      "All participants are advised to wear comfortable clothing and shoes which are fit for dancing.",
      "Participants should also bring a notepad with a pencil/pen in case they wish to take notes.",
      "All participants should carry a water bottle, a towel and a small high energy snack as this will be a physically intense session."
    ],
    poster: "img/posters/rythm-loom.jpeg",
    guidelinesPdf: "https://drive.google.com/file/d/1eAh82nTQoBz8gsJunA2h6hmmSvVLJ1uc/view?usp=drive_link"
  },
  {
    id: "mixed-media",
    title: "Rooh ka Resha",
    subtitle: "Mixed Media",
    category: "visual",
    competitive: true,
    date: "18th August",
    venue: "Crafts Room, 10:00 AM – 01:00 PM",
    description: "Mixed media art celebrates the beauty of bringing together diverse materials, techniques, and perspectives into one unified creation. Much like the threads of a woven fabric, each element contributes its own texture, colour, and character, reminding us that our differences enrich the collective story of humanity. Through creativity and experimentation, artists transform individual pieces into powerful expressions of connection, resilience, and hope.\n\nThis competition invites participants to interpret “ताना-बाना: The Timelessness of Humanity” through the limitless possibilities of mixed media. Participants are encouraged to combine different artistic materials, styles, and textures to create original works that reflect the bonds connecting people across cultures, generations, and experiences. Whether inspired by unity, shared memories, compassion, or the strength found in diversity, each artwork should celebrate the idea that humanity is woven together by countless unique threads, forming one timeless tapestry.\n\nThis version aligns closely with the Kaafila theme while emphasizing the experimental and innovative nature of Mixed Media.",
    guidelines: [
      "Participants should create artworks interpreting the specific theme that will be sent closer to the date of Kaafila.",
      "A maximum of 15 registrations will be accepted to this competition, with 2 students from each school competing as a team, with one team per school.",
      "Participants must incorporate a minimum of 2 mediums into their artwork.",
      "A concept note detailing the participant's interpretation of the theme and their intent, as well as any inspirations behind their work, must accompany the artwork. This note must not exceed 200 words.",
      "A base frame surface will be provided at the venue of the competition. Apart from this, participants are expected to bring their own supplies as per their requirement (eg upcycled materials like used bottles, old newspapers, fabrics, old buttons, threads/wool, jute bags, fabric scraps, adhesive materials such as Fevicol and glue guns etc). Any supplies not mentioned in the guidelines will NOT BE PERMITTED. Usage of pre-made props will lead to immediate disqualification.",
      "Please note that the host school will not be participating as a competitor in any event this year."
    ],
    criteria: ["Interpretation and Clarity of the theme to the viewer.", "Quality of Artistic Composition along with techniques and styles used.", "Creativity and originality of the work.", "Balance of colours and effective usage of space.", "Usage of upcycled materials and the creativity in their incorporation."],
    guidelinesPageCount: 2,
    poster: "img/posters/mixed-media.jpg",
    guidelinesPdf: "https://drive.google.com/file/d/1h2CsZjWceBsScUfOFaMwyJgYkmBoSLYD/view?usp=drive_link"
  },
  {
    id: "canvas-painting",
    title: "Rangrez",
    subtitle: "Canvas Painting",
    category: "visual",
    competitive: true,
    date: "20th August",
    venue: "Room 103+104, Middle Block, 3rd Floor, 09:00 AM – 12:00 PM",
    description: "Canvas painting has long been a powerful language of humanity, allowing artists to transform emotions, experiences, and ideas into timeless works of art. Across generations and cultures, paintings have preserved stories, celebrated diversity, challenged injustice, and reminded us of the shared emotions that connect us all. Every brushstroke becomes a thread in the larger tapestry of human expression.\n\nThis competition invites participants to explore the theme “ताना-बाना: The Timelessness of Humanity” through original canvas paintings. Artists are encouraged to interpret how art weaves together different lives, cultures, histories, and identities into one shared human experience. Whether portraying compassion, resilience, hope, unity, or moments of everyday joy, participants should create meaningful artworks that celebrate the invisible threads binding humanity together. Through colour, texture, composition, and imagination, let your canvas become a testament to the beauty of our collective story.",
    guidelines: [
      "Participants should create artworks interpreting the specific theme that will be sent closer to the date of Kaafila.",
      "The canvas for the competition will be provided by the school. Participants must bring their own required stationery and painting tools, including palettes, mixing plates and paints. Any supplies not mentioned in the guidelines will NOT BE PERMITTED.",
      "The medium used by participants must be acrylics on canvas.",
      "The time limit for creating the artwork is 2.5 hours, from start to finish. And 30 minutes for concept notes.",
      "Please make sure you reach the venues on time, no extra time will be allotted.",
      "A concept note describing the interpretation of the theme, the creative process and any inspirations behind the artwork is mandatory. This note must not exceed 200 words.",
      "A maximum of 20 registrations will be accepted to this competition, with 2 students from each school competing as a team.",
      "The use of coarse language or obscene images is strictly prohibited. Entries containing inappropriate content will lead to immediate disqualification.",
      "Any sign of plagiarism will lead to immediate elimination.",
      "Participants will have 2.5 hours to complete their art pieces from start to finish. Rough sketches are allowed beforehand, but participants must begin their final piece from scratch during the competition hours. And 30 minutes for concept notes.",
      "Please note that the host school will not be participating as a competitor in any event this year."
    ],
    criteria: ["Creativity", "Originality", "Interpretation and adherence to the theme", "Technical skill", "Composition and spatial organisation", "Overall aesthetic appeal", "Application of colors"],
    poster: "img/posters/canvas-painting.jpg",
    guidelinesPdf: "https://drive.google.com/file/d/1C5PyRtCIrRctzd5NNyOZPiM7H4Asb9_b/view?usp=drive_link"
  },
  {
    id: "dress-to-express",
    title: "Dress to Express",
    subtitle: "Wearable Art Workshop",
    category: "visual",
    competitive: false,
    date: "18th & 20th August",
    venue: "Day 1: Film and Theatre Studio — costume making 11:00 AM – 12:30 PM, break, embodiment 01:00 PM – 02:30 PM · Day 2: IC Theatre & Film Studio, 09:00 AM – 02:00 PM",
    description: "Clothing has always been more than fabric—it carries memories, traditions, identities, and stories passed from one generation to the next. Every stitch, pattern, colour, and texture reflects the people, cultures, and experiences that shape who we are. Just as ताना-बाना weaves individual threads into one fabric, our choices in clothing weave together the many stories that make up humanity.\n\nDress To Express invites participants to explore wearable art as a celebration of identity and connection. Participants will experiment with textiles, recycled materials, unconventional objects, and symbolic design to create garments that tell meaningful stories. Rather than following trends, each creation should express values, heritage, dreams, or shared human experiences.\n\nThis workshop encourages participants to look beyond fashion and see clothing as a living canvas of humanity. Every garment becomes a reflection of the threads that unite us across cultures, generations, and communities—showing that while every story is unique, together they form one timeless tapestry.",
    guidelines: [
      "Each school may nominate one team of up to 2 students. One of whom will act as a model for the exhibition.",
      "The model is to be asked to carry a bodysuit/white salwar/shirt+pant.",
      "All garments and accessories must be original creations interpreting the specific theme that will be sent closer to the date of Kaafila.",
      "Outfits must incorporate at least three distinct materials or techniques such as textiles, paint, embroidery, recycled elements, digital prints, etc.",
      "A 200-word concept note must accompany each submission. This should clearly explain the team's interpretation of the theme, design intent, materials used, and any artistic or cultural inspirations.",
      "All materials will be provided. If the participants so wish, they may bring extra material such as upcycled or sustainable resources (e.g. scrap fabric, old clothes, bottle caps, jute, newspapers, cardboard, thread, natural dyes, etc). No materials outside those declared in the final list will be permitted.",
      "A space for display will be provided. Teams are responsible for their own setup and dressing their model.",
      "Any use of explicit language, offensive symbols, or inappropriate imagery will result in disqualification.",
      "All designs must be original. Any evidence of copying will lead to immediate elimination.",
      "This is a 2-day event, the first day includes an offline workshop with the facilitator to understand what is expected of the participant as well as basic sewing and design skills. The second day will be an offline event, where participants will be given a total of 3 hours to prepare and assemble their looks at the venue. Base designs will be planned in advance on the first day, but final execution (including assembling, styling, and adjustments) will occur on-site, on the second day."
    ],
    poster: "img/posters/dress-to-express.jpg",
    guidelinesPdf: "https://drive.google.com/file/d/1xkwhEYyLya6Fud3SU43tZTLraY17T9jI/view?usp=drive_link"
  },
  {
    id: "improv-nukkad-natak",
    title: "Chaupaal",
    subtitle: "Improv Street Play",
    category: "theatre",
    competitive: true,
    date: "20th August",
    venue: "IC Amphitheatre — Theme reveal (Classrooms) 09:30 AM – 10:00 AM · Performance 12:00 PM – 02:00 PM",
    description: "This year, the Improv Street Play, under the theme “ताना-बाना: The Timelessness of Humanity,” invites performers to discover the unseen threads that connect us, even in moments of division.\n\nIn today’s world, we see a lot of division, apathy and hate, and are thus blinded from acts of kindness, resilience, love that exist out of the spotlight. So, through lively street theatre, participants will explore themes of humanity, connection, and shared experiences to bring forth truly vibrant stories about the different aspects of what makes us human.\n\nParticipants will get short prompts related to the theme and will have to create performances on the spot, without prior scripts or preparation. By working as a team and thinking quickly, they’ll make new characters, build plots, create conflicts, and find ways to resolve them.\n\nThe streets will be their stage and the audience part of their performance, as actors bring stories full of human emotion. Whether they are portraying communities coming together in times of hardship, or challenging prejudice, or even celebrating the subtle acts of kindness that unite us, each performance will reflect the incredible power of humanity.\n\nThis competition celebrates the brave and creative spirit of improvisation, where anything can happen, and every moment has the power to bring people together and share something real.\n\nLet the streets ring with stories waiting to be told through mysterious threads of time.",
    guidelines: [
      "Each team may have 7-10 participants.",
      "A maximum of one team per school is allowed to register.",
      "Teams will gather at a common location and be assigned a topic on the spot.",
      "Participants will have 2 hours to design, write, and rehearse their street play.",
      "Teacher guidance or external help of any kind is strictly prohibited.",
      "Teams are free to choose their own creative process to develop their performance.",
      "The final performance must not exceed 8 minutes.",
      "All scenes should be originally curated by the team performing them and should be based upon the topic received.",
      "Each play must include: at least two songs; participation of all members; a dress code of kurta, jeans/pants, and/or dupatta for performers. Props and set design are allowed but will not be provided by the school. The use of obscene images is strictly prohibited.",
      "Please note that the host school will not be participating as a competitor in any event this year."
    ],
    criteria: ["Creativity", "Clarity of message", "Team collaboration", "Composition and design", "Audience Awareness"],
    poster: "img/posters/improv-nukkad-natak.jpg",
    guidelinesPdf: "https://drive.google.com/file/d/1j4tD3EwojW2WeHtGDGU4AANAd7djE3SD/view?usp=drive_link"
  },
  {
    id: "one-act-play",
    title: "As You Weave It!",
    subtitle: "One Act Play",
    category: "theatre",
    competitive: true,
    date: "18th August",
    venue: "WCH, 09:45 AM – 12:30 PM · Discussion, Collab Room 1, 12:30 PM – 01:30 PM",
    description: "This year, the one-act play, under the theme “ताना-बाना: The Timelessness of Humanity,” invites student actors to explore the invisible threads that bind us together. These threads connect our different cultures, histories, and lived experiences and slowly weave together the core of our humanity. Participants will create original one-act plays that aim to celebrate and represent how empathy, resilience, and the pillars of humanity unite us beyond our many differences.\n\nThe competition encourages young artists to tell stories of rays of hope emerging from bleak conflict, the battle between being compassionate and succumbing to prejudice as well as ordinary moments that remind us of the unbreakable spirit that we all have. With these ideas in mind, participants can explore themes such as belonging, identity, solidarity, and the power of humanity through art.\n\nThrough creative theatre techniques, strong storytelling, memorable characters, and riveting group performances, students will bring to life stories that question, or challenge or even reveal the importance of unity while embracing diversity. This event gives young actors a chance to stretch their creativity and share their unique voices.\n\nSo, let the stage become a loom for every voice that aims to weave together a tapestry of stories that celebrate the timelessness of humanity.",
    guidelines: [
      "Each team will be given a maximum of 25 minutes in total: from an empty stage to an empty stage.",
      "A maximum of 5 teams will be selected for the final event.",
      "Each school must enter with only one theatrical production, and all performances must clearly connect to the theme \"Taana Baana.\"",
      "Each production may include up to 18 cast and crew members, including actors, the director, producer, and backstage crew.",
      "A maximum of 15 actors may perform on stage during the play.",
      "The production can be: an original script, a re-interpretation of an existing play/short story/novel, or an adaptation, as per the team's preference.",
      "Scripts should be primarily in English and/or Hindi. Other languages may be used if they fit the context of the play.",
      "No obscene images nor any discriminatory language is to be used.",
      "Preliminary Round: in case of excess in the number of registrations for this category, we might have to conduct a preliminary round. All teams will be asked to submit a 2-3 minute long scene (excerpt) from their final play after all registrations have happened. The form will be shared separately and kept open till 7th August. Judging Panel: a mix of internal, external and student panellists will assess the entries to ensure no conflict of interest. Shortlisting: a maximum of 5 teams will be selected for the final round. Result Announcement: all schools, whether accepted or not, will get an email confirming whether they passed the preliminary round or not, by 8th August.",
      "Tech Check: the school will provide a 30 mins slot for venue rehearsal in the auditorium for a technical run two days prior to the event. The schedule for the same will be shared a week in advance. Every school will be given a green room for preparation. We would encourage the teams to NOT watch performances by the other schools during these tech checks and rather focus on theirs.",
      "Sets & Props: all sets and props are the responsibility of the participating school. Extravagant sets and properties are discouraged and should be avoided. Basic props (such as chairs and tables) will be provided to the school based on a previously shared request in the prescribed format. General lighting will be provided, however no specific light design will be incorporated during performance. After the performance, the stage shall be cleared by the participants for the next performance.",
      "Any music required during the performance must be carried on an external pen drive which will be connected to the team's OWN device, and emailed 2 days in advance to the KAAFILA official email ID as a backup.",
      "Please note that the host school will not be participating as a competitor in any event this year."
    ],
    criteria: ["Interpretation of Theme", "Acting Choices", "Performance Design", "Relevance of Content"],
    guidelinesPageCount: 3,
    poster: "img/posters/one-act-play.jpg",
    guidelinesPdf: "https://drive.google.com/file/d/1gnmOilNubbw32CnrxyQtKbbpTIijQ5xC/view?usp=drive_link"
  },
  {
    id: "standup-workshop",
    title: "Thahaaka",
    subtitle: "Stand Up Comedy Workshop",
    category: "theatre",
    competitive: false,
    date: "18th & 20th August",
    venue: "Senior Theatre Room — 18th, 10:30 AM – 12:30 PM · 20th, 12:00 PM – 02:00 PM",
    description: "Throughout the course of history, through the rise and fall of so many empires scattered across the world, the emergence of music marked a significant development in the arts. As centuries have passed, different music styles have also emerged- blues in the 1880s, rock n’ roll in the 1940s, and beatboxing in the 1970s.\n\nBeatboxing in particular is a form of music that employs vocal techniques that imitate the sound of drum machines using one’s mouth, lips, tongue, throat, and voice. Emerging when the Roland TR-808 was released, followed by its successor the Roland TR-909, beatboxing quickly gained popularity when people began imitating the machines’ sounds using their mouths. The first people who began practicing this art form were “The Fat Boys,” an iconic band at the time. Today, New School Beatboxing has become a medium of self expression which employs many vaster forms and techniques that further the art’s scope.\n\nLed by popular beatboxer Kunal Grover, this year at Kaafila, we invite you to attend a workshop where you will learn the basics of this iconic art form. Join us for an unforgettable experience, a novel event in Kaafila history here at Shiv Nadar School. Let’s broaden our understanding of music beyond the conventional, and immerse ourselves in the vast world of this beautiful art form!",
    guidelines: [
      "The workshop will be conducted on two days. It is strongly recommended that you attend both the days to be able to make the most of the learning. Towards the end of the second day, we will culminate the journey with an open mic.",
      "A maximum of 15 participants will be permitted.",
      "Participants are to carry their own writing material. A writing diary is advised.",
      "Those who wish to participate may register for this workshop beforehand.",
      "In the case of any slots remaining, they will be filled on a first come first serve basis.",
      "All students must reach the venue 10 minutes prior to the workshop to ensure the workshop begins and culminates on time.",
      "Accompanying teachers are free to observe the workshop.",
      "Students participating in the workshop must wear comfortable, loose clothes for ease of movement.",
      "To be presented a Certificate of Participation, the participant is required to attend both days of the workshop."
    ],
    poster: "img/posters/standup-comedy.jpeg",
    guidelinesPdf: "https://drive.google.com/file/d/1kJNWo88Flh1PcL7fOhHac8l5TBWIoJAj/view?usp=drive_link"
  }
];

// NOTE: the concept-note text for "Beat Beyond Borders" and "Thahaka" is
// identical in the source brochure (an apparent copy/paste duplication in
// the original document) — reproduced as-is rather than invented.

// Full festival schedule, day by day. Items with an `eventId` link through
// to that event's detail page and show its category tag; items without one
// are general festival happenings (ceremonies, food festivals, etc.) shown
// as plain rows.
// 18th and 20th are transcribed from the finalised brochure's "Flow of the
// Day". Those tables list times only, so rows carry no venue; the renderer
// omits the line rather than showing a stale room. The 17th and 19th are
// unchanged — the finalised text to hand does not cover them.
// `date` is the same day in machine-readable form (local time). The schedule
// page only ever prints `day`, but the Updates console on the home page needs
// real Date objects to know what is over, what is live and what is next, and
// deriving them from the prose would mean parsing "18th August, Tuesday".
const KAAFILA_SCHEDULE = [
  {
    day: "18th August, Tuesday",
    date: "2026-08-18",
    items: [
      { time: "08:30 AM – 09:00 AM", title: "Registrations", venue: "Admin Block, Main Foyer" },
      { time: "09:00 AM – 09:40 AM", title: "Opening Ceremony", venue: "WCH, 2nd Floor, Admin Block" },
      { time: "09:45 AM – 12:30 PM", title: "As You Weave It! (One Act Play)", venue: "WCH, 2nd Floor, Admin Block", eventId: "one-act-play" },
      { time: "10:00 AM – 12:00 PM", title: "Naad Sutra (Hindustani Vocal)", venue: "IC MPH, 4th Floor, IC Block", eventId: "hindustani-vocal-competition" },
      { time: "10:00 AM – 12:00 PM", title: "Rhythm Loom (Contemporary Dance)", venue: "Middle Block Dance Room, Room 101+102, Third Floor", eventId: "jazz-workshop" },
      { time: "10:00 AM – 01:00 PM", title: "Rooh ka Resha (Mixed Media)", venue: "Room 103+104, Middle Block, 3rd Floor", eventId: "mixed-media" },
      { time: "10:30 AM – 12:30 PM", title: "Thahaaka (Stand Up Comedy)", venue: "Senior Theatre Room", eventId: "standup-workshop" },
      { time: "11:00 AM – 02:30 PM", title: "Dress to Express (Day 1) — Costume Making & Embodiment", venue: "Film and Theatre Studio, IC Block, 2nd Floor", note: "Runs in two phases — costume making 11:00 AM – 12:30 PM, then a break, then embodiment 01:00 PM – 02:30 PM.", eventId: "dress-to-express" },
      { time: "12:30 PM – 01:30 PM", title: "One Act Play Discussion", venue: "WCH, 2nd Floor, Admin Block", eventId: "one-act-play" },
      { time: "02:00 PM – 02:30 PM", title: "The Grand Weave (Award Ceremony)", venue: "WCH, 2nd Floor, Admin Block" },
      { time: "03:45 PM – 04:45 PM", title: "Headline Act (ft.Darzi)", venue: "WCH, 2nd Floor, Admin Block" }
    ]
  },
  {
    day: "19th August, Wednesday",
    date: "2026-08-19",
    note: "For Shiv Nadar School, Noida students only.",
    items: [
      { time: "09:30 AM - 10:30 AM", title: "Keynote Speaker(Aryaan Misra and Aishwarya Singh)", venue:"WCH, 2nd Floor, Admin Block"},
      { time: "11:00 AM – 01:00 PM", title: "Spotlight for PY Students", venue: "WCH, 2nd Floor, Admin Block" },
      { time: "12:00 PM – 01:15 PM", title: "Middle School — Food Festival", venue: "Across School Courtyard" },
      { time: "01:40 PM – 03:10 PM", title: "SY Food Festival", venue: "Across School Courtyard" },
      { time: "03:30 PM – 04:45 PM", title: "KNMA Workshop (for teachers)", venue: "Film and Theatre Studio, IC Block, 2nd Floor" },
      { time: "03:30 PM – 05:00 PM", title: "Spotlight for Parents", venue: "IC MPH, 4th Floor, IC Block" },
      { time: "05:30 PM – 06:30 PM", title: "Shaam-e-Rang (ft.Mukhtiyar Ali)", venue: "WCH, 2nd Floor, Admin Block" }
    ]
  },
  {
    day: "20th August, Thursday",
    date: "2026-08-20",
    items: [
      { time: "08:30 AM – 09:00 AM", title: "Registrations", venue: "Admin Block, Main Foyer" },
      { time: "09:00 AM – 10:00 AM", title: "Anugoonj (Solo Dance)", venue: "WCH, 2nd Floor, Admin Block", eventId: "classical-solo-dance-competition" },
      { time: "09:00 AM – 12:00 PM", title: "Rangrez (Canvas Painting)", venue: "Room 103+104, Middle Block, 3rd Floor", eventId: "canvas-painting" },
      { time: "09:00 AM – 02:00 PM", title: "Dress to Express (Day 2)", venue: "Film and Theatre Studio, IC Block, 2nd Floor", eventId: "dress-to-express" },
      { time: "09:30 AM – 10:00 AM", title: "Chaupaal (Street Play Theme Reveal)", venue: "IC Amphitheatre, Ground Floor, IC Block", eventId: "improv-nukkad-natak" },
      { time: "10:00 AM – 11:00 AM", title: "Beat Beyond Borders (Beat Boxing)", venue: "IC MPH, 4th Floor, IC Block", eventId: "beat-beyond-borders" },
      { time: "10:00 AM – 12:00 PM", title: "Weave the Beat (Group Dance)", venue: "WCH, 2nd Floor, Admin Block", eventId: "souls-in-sync" },
      { time: "11:30 AM – 01:30 PM", title: "Thahaaka (Stand Up Comedy)", venue: "IC MPH, 4th Floor, IC Block", eventId: "standup-workshop" },
      { time: "12:00 PM – 02:00 PM", title: "Chaupaal (Street Play Performance)", venue: "IC MPH, 4th Floor, IC Block", eventId: "improv-nukkad-natak" },
      { time: "01:30 PM – 02:30 PM", title: "Food Festival", venue: "Across School Courtyard" },
      { time: "03:00 PM – 05:00 PM", title: "Clash of Bands (Rock Band)", venue: "WCH, 2nd Floor, Admin Block", eventId: "clash-of-bands" },
      { time: "06:00 PM – 06:30 PM", title: "Curtain Drawing (Closing Ceremony)", venue: "WCH, 2nd Floor, Admin Block" }
    ]
  }
];

/* -------------------------------------------------------------------------
   Updates — the festival noticeboard, shown on the home page as one card per
   update. THIS IS THE ONE LIST TO EDIT WHEN SOMETHING IS ANNOUNCED. Add the
   newest update at the top; the cards read in this order.

   text     the headline, one line. Kept short — it is the card's title.
   note     the quieter line under it. Optional.
   href     where the card goes when clicked. Optional; when `eventId` is set
            and href is not, the event's own page is used.
   eventId  ties the update to an event in KAAFILA_EVENTS. The card then takes
            that event's category — its label and its thread colour — instead
            of reading as a general announcement.

   Nothing here is dated: an update stays up until it is deleted, which is
   easier to keep honest than a list of expiry dates nobody revisits.
   ------------------------------------------------------------------------- */
const KAAFILA_UPDATES = [
  {
    text: "The Kaafila Award",
    note: "Maximum participation — Ramagya School"
  },
  {
    text: "Naad Sutra (Hindustani Vocals)",
    note: "1st Somerville School · 2nd Ramagya School · 3rd Genesis Global School",
    eventId: "hindustani-vocal-competition"
  },
  {
    text: "As You Weave It (One Act Play)",
    note: "Best Play — Ramagya School · Best Interpretation of Theme — Ramagya School · Best Stage Craft — Tagore International School",
    eventId: "one-act-play"
  },
  {
    text: "Chaupaal (Street Play)",
    note: "1st Somerville School · 2nd Vidyagyan Leadership Academy · 3rd Gyanshree School Noida",
    eventId: "improv-nukkad-natak"
  },
  {
    text: "Anugoonj (Classical Solo Dance)",
    note: "1st Ramagya School · 2nd Jayshree Periwal International School · 3rd Army Public School Shankar Vihar",
    eventId: "classical-solo-dance-competition"
  },
  {
    text: "Weave the Beat (Western Group Dance)",
    note: "1st DPS International Gurgaon · 2nd Jayshree Periwal International School · 3rd Vidyagyan Leadership Academy",
    eventId: "souls-in-sync"
  },
  {
    text: "Rooh ka Resha (Mixed Media)",
    note: "1st Satya School Gurgaon · 2nd Gurukul The School · 3rd Heritage Experiential School",
    eventId: "mixed-media"
  },
  {
    text: "Rangrez (Canvas Painting)",
    note: "1st Vasant Valley School · 2nd Prakriti School · 3rd Jayshree Periwal International School",
    eventId: "canvas-painting"
  },
  {
    text: "Clash of Bands (Rock Band)",
    note: "1st Somerville School · 2nd Ramagya School · 3rd Mayoor School",
    eventId: "clash-of-bands"
  }
];
