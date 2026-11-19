import React, { useEffect, useMemo, useState } from "react";
import {
  Alert, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from "react-native";
import * as SQLite from "expo-sqlite";
import * as Speech from "expo-speech";

type Tab = "Home" | "Missions" | "Study" | "Translate" | "AI";
type Screen = "home" | "missions" | "flashcards" | "dictionary" | "social" | "chat" | "quiz" | "profile";
type Phrase = { ko: string; en: string; bn: string; roman: string; category: string };
const C = { bg: "#0B132B", card: "#1C2541", cyan: "#5BC0BE", white: "#F4F7FB", muted: "#A8B3C7", green: "#58C28B", red: "#F07878" };

const phrases: Phrase[] = [
  { ko:"안녕하세요", en:"Hello", bn:"হ্যালো", roman:"annyeonghaseyo", category:"Greeting" },
  { ko:"감사합니다", en:"Thank you", bn:"ধন্যবাদ", roman:"gamsahamnida", category:"Greeting" },
  { ko:"얼마예요?", en:"How much is it?", bn:"এটার দাম কত?", roman:"eolmayeyo?", category:"Shopping" },
  { ko:"화장실이 어디예요?", en:"Where is the bathroom?", bn:"বাথরুম কোথায়?", roman:"hwajangsiri eodiyeyo?", category:"Travel" },
  { ko:"이거 주세요", en:"Please give me this", bn:"দয়া করে এটা দিন", roman:"igeo juseyo", category:"Restaurant" },
  { ko:"카드 돼요?", en:"Can I pay by card?", bn:"কার্ডে পেমেন্ট করা যাবে?", roman:"kadeu dwaeyo?", category:"Shopping" },
  { ko:"천천히 말해 주세요", en:"Please speak slowly", bn:"দয়া করে ধীরে কথা বলুন", roman:"cheoncheonhi malhae juseyo", category:"Conversation" },
  { ko:"도와주세요", en:"Please help me", bn:"দয়া করে আমাকে সাহায্য করুন", roman:"dowajuseyo", category:"Emergency" },
];

const missions = [
  { title:"GS25 Convenience Store", icon:"🏪", desc:"Buy a drink, ask for a bag, and pay at the counter.", lines:[["어서 오세요","Welcome"],["봉투 필요하세요?","Do you need a bag?"],["네, 주세요","Yes, please."]] },
  { title:"Subway Station", icon:"🚇", desc:"Ask for directions and understand station announcements.", lines:[["서울역에 어떻게 가요?","How do I get to Seoul Station?"],["몇 번 출구예요?","Which exit number?"]] },
  { title:"Restaurant", icon:"🍜", desc:"Get a table, order food, and ask for the bill.", lines:[["두 명이에요","There are two of us."],["메뉴판 주세요","Please give me the menu."],["계산해 주세요","The bill, please."]] },
  { title:"Immigration Office", icon:"🏢", desc:"Practice simple phrases for an immigration visit.", lines:[["예약했어요","I have an appointment."],["서류 여기 있습니다","Here are my documents."]] },
];

const quizItems = [
  { q:"What does 감사합니다 mean?", opts:["Hello","Thank you","Goodbye","Excuse me"], answer:1, ko:"감사합니다" },
  { q:"How do you say 'How much is it?'", opts:["안녕하세요","도와주세요","얼마예요?","잘 자요"], answer:2, ko:"얼마예요?" },
  { q:"What does 화장실 mean?", opts:["Restaurant","Bathroom","Station","School"], answer:1, ko:"화장실" },
  { q:"Choose 'Please help me'.", opts:["도와주세요","감사합니다","괜찮아요","안녕히 가세요"], answer:0, ko:"도와주세요" },
  { q:"What does 이거 주세요 mean?", opts:["I don't know","Please give me this","Where is it?","It's delicious"], answer:1, ko:"이거 주세요" },
];

function Button({ title, onPress, secondary=false }: {title:string; onPress:()=>void; secondary?:boolean}) {
  return <TouchableOpacity onPress={onPress} style={[styles.button, secondary && styles.buttonSecondary]}><Text style={[styles.buttonText, secondary && {color:C.cyan}]}>{title}</Text></TouchableOpacity>;
}
function Card({ children }: {children:React.ReactNode}) { return <View style={styles.card}>{children}</View>; }
function Label({ children }: {children:React.ReactNode}) { return <Text style={styles.label}>{children}</Text>; }

export default function App() {
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [tab, setTab] = useState<Tab>("Home");
  const [screen, setScreen] = useState<Screen>("home");
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(1);
  const [mistakes, setMistakes] = useState<string[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [query, setQuery] = useState("");
  const [formal, setFormal] = useState(true);
  const [missionIndex, setMissionIndex] = useState(0);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizDone, setQuizDone] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<{from:string;text:string;translation:string}[]>([
    {from:"AI Tutor",text:"안녕하세요! 오늘 무엇을 연습할까요?",translation:"Hello! What would you like to practice today?"}
  ]);

  useEffect(() => {
    (async () => {
      const database = await SQLite.openDatabaseAsync("hangulmate.db");
      await database.execAsync(`CREATE TABLE IF NOT EXISTS progress (id INTEGER PRIMARY KEY NOT NULL, xp INTEGER NOT NULL, streak INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS mistakes (id INTEGER PRIMARY KEY AUTOINCREMENT, word TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS completed_missions (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL UNIQUE);`);
      const row = await database.getFirstAsync<{xp:number;streak:number}>("SELECT xp, streak FROM progress WHERE id=1");
      if (row) { setXp(row.xp); setStreak(row.streak); }
      const saved = await database.getAllAsync<{word:string}>("SELECT word FROM mistakes ORDER BY id DESC LIMIT 30");
      setMistakes(saved.map(x=>x.word));
      setDb(database);
    })().catch(e => Alert.alert("Database error", String(e)));
  }, []);

  const award = async (amount:number) => {
    const next = xp + amount; setXp(next);
    if (db) await db.runAsync("INSERT OR REPLACE INTO progress (id,xp,streak) VALUES (1,?,?)", next, streak);
  };
  const addMistake = async (word:string) => {
    setMistakes(prev=>[word,...prev]);
    if (db) await db.runAsync("INSERT INTO mistakes (word) VALUES (?)", word);
  };
  const speak = (text:string) => Speech.speak(text,{language:"ko-KR",rate:0.85});
  const go = (s:Screen, t:Tab) => { setScreen(s); setTab(t); };
  const filtered = useMemo(()=>phrases.filter(p => (p.ko+p.en+p.bn+p.category).toLowerCase().includes(query.toLowerCase())),[query]);

  const Header = ({title, back}: {title:string;back?:boolean}) => <View style={styles.header}>
    {back && <TouchableOpacity onPress={()=>go("home","Home")}><Text style={styles.back}>‹</Text></TouchableOpacity>}
    <View style={{flex:1}}><Text style={styles.brand}>한글메이트</Text><Text style={styles.heading}>{title}</Text></View>
    <Text style={styles.avatar}>👤</Text>
  </View>;

  const renderHome = () => <><Header title="Your learning dashboard"/>
    <Card><Text style={styles.eyebrow}>WELCOME BACK</Text><Text style={styles.hero}>안녕하세요! 👋</Text><Text style={styles.muted}>Small steps every day make you fluent.</Text>
      <View style={styles.stats}><View><Text style={styles.statNum}>🔥 {streak}</Text><Text style={styles.muted}>Day streak</Text></View><View><Text style={styles.statNum}>⭐ {xp}</Text><Text style={styles.muted}>Total XP</Text></View><View><Text style={styles.statNum}>🎯 10</Text><Text style={styles.muted}>Daily goal</Text></View></View>
    </Card>
    <Label>Continue learning</Label>
    <View style={styles.grid}>
      {[
        ["🎭","Survival Missions","Practice real-life Korean",()=>go("missions","Missions")],
        ["🃏","Flashcards","Remember useful words",()=>go("flashcards","Study")],
        ["🧬","Mistake DNA","Review your weak words",()=>go("profile","Study")],
        ["🗣️","AI Conversation","Practice speaking",()=>go("chat","AI")],
        ["🔤","Dictionary","Korean · English · Bengali",()=>go("dictionary","Translate")],
        ["🤝","Social Decoder","Formal and casual speech",()=>go("social","Translate")],
      ].map(([icon,title,desc,fn]:any)=><TouchableOpacity key={title} style={styles.tile} onPress={fn}><Text style={styles.tileIcon}>{icon}</Text><Text style={styles.tileTitle}>{title}</Text><Text style={styles.mutedSmall}>{desc}</Text></TouchableOpacity>)}
    </View>
    <Card><Text style={styles.cardTitle}>Daily challenge</Text><Text style={styles.body}>Learn five survival phrases and earn 20 XP.</Text><Button title="Start flashcards →" onPress={()=>go("flashcards","Study")}/></Card>
  </>;

  const renderMissions = () => <><Header title="Korea Survival Missions" back/><Text style={styles.muted}>Practice useful conversations for everyday situations in Korea.</Text>
    {missions.map((m,i)=><TouchableOpacity key={m.title} onPress={()=>setMissionIndex(i)}><Card><Text style={styles.tileIcon}>{m.icon}</Text><Text style={styles.cardTitle}>{m.title}</Text><Text style={styles.body}>{m.desc}</Text><Text style={styles.link}>{missionIndex===i?"Selected · Start practice ↓":"Open mission →"}</Text></Card></TouchableOpacity>)}
    <Card><Text style={styles.cardTitle}>{missions[missionIndex].title} practice</Text>{missions[missionIndex].lines.map(([ko,en])=><View key={ko} style={styles.phraseRow}><View style={{flex:1}}><Text style={styles.korean}>{ko}</Text><Text style={styles.muted}>{en}</Text></View><TouchableOpacity onPress={()=>speak(ko)}><Text style={styles.speaker}>🔊</Text></TouchableOpacity></View>)}<Button title="Complete mission · +20 XP" onPress={()=>award(20)}/></Card>
  </>;

  const renderFlashcards = () => { const p=phrases[cardIndex%phrases.length]; return <><Header title="Interactive Flashcards" back/><Text style={styles.muted}>Card {cardIndex+1} of {phrases.length} · Tap the card to flip it.</Text>
    <TouchableOpacity activeOpacity={0.9} onPress={()=>setFlipped(!flipped)}><View style={[styles.flashcard,flipped&&{borderColor:C.cyan}]}><Text style={styles.eyebrow}>{flipped?"MEANING":"KOREAN WORD"}</Text><Text style={styles.flashKorean}>{flipped?p.en:p.ko}</Text><Text style={styles.body}>{flipped?`বাংলা: ${p.bn}`:p.roman}</Text><Text style={styles.link}>Tap to flip</Text><TouchableOpacity onPress={()=>speak(p.ko)}><Text style={styles.speaker}>🔊 Listen</Text></TouchableOpacity></View></TouchableOpacity>
    <View style={styles.row}><Button title="← Previous" secondary onPress={()=>{setCardIndex((cardIndex+phrases.length-1)%phrases.length);setFlipped(false)}}/><Button title="Next →" onPress={()=>{setCardIndex((cardIndex+1)%phrases.length);setFlipped(false)}}/></View>
    <Label>How well did you remember?</Label><View style={styles.row}><Button title="Hard" secondary onPress={()=>{addMistake(p.ko);award(2);setCardIndex((cardIndex+1)%phrases.length);setFlipped(false)}}/><Button title="Good" onPress={()=>{award(5);setCardIndex((cardIndex+1)%phrases.length);setFlipped(false)}}/></View><Button title="Easy · +10 XP" onPress={()=>{award(10);setCardIndex((cardIndex+1)%phrases.length);setFlipped(false)}}/>
  </>; };

  const renderDictionary = () => <><Header title="Trilingual Dictionary" back/><TextInput value={query} onChangeText={setQuery} placeholder="Search Korean, English or Bengali..." placeholderTextColor={C.muted} style={styles.search}/>{filtered.map(p=><Card key={p.ko}><View style={styles.phraseRow}><View style={{flex:1}}><Text style={styles.korean}>{p.ko}</Text><Text style={styles.body}>{p.en}</Text><Text style={styles.muted}>{p.bn}</Text><Text style={styles.mutedSmall}>{p.roman} · {p.category}</Text></View><TouchableOpacity onPress={()=>speak(p.ko)}><Text style={styles.speaker}>🔊</Text></TouchableOpacity></View></Card>)}{filtered.length===0&&<Text style={styles.muted}>No survival phrases found.</Text>}</>;

  const renderSocial = () => <><Header title="Korean Social Decoder" back/><Card><Text style={styles.cardTitle}>Choose your speaking style</Text><View style={styles.row}><Button title="Campus Formal 존댓말" onPress={()=>setFormal(true)} secondary={!formal}/><Button title="Friends Casual 반말" onPress={()=>setFormal(false)} secondary={formal}/></View><Text style={styles.eyebrow}>EXAMPLE PHRASE</Text><Text style={styles.flashKorean}>{formal?"안녕하세요":"안녕"}</Text><Text style={styles.body}>{formal?"Hello (polite)":"Hi (casual)"}</Text><Button title="🔊 Hear pronunciation" onPress={()=>speak(formal?"안녕하세요":"안녕")}/></Card><Card><Text style={styles.cardTitle}>Culture tip 🇰🇷</Text><Text style={styles.body}>Use 존댓말 with professors, older people, and people you do not know well. 반말 is usually for close friends when both people are comfortable using it. When unsure, start politely.</Text></Card></>;

  const renderChat = () => <><Header title="AI Conversation Practice" back/><Card><Text style={styles.eyebrow}>DEMO MODE</Text><Text style={styles.body}>This starter includes a local practice conversation. Live Gemini replies require a secure backend and your API key.</Text></Card>{messages.map((m,i)=><Card key={i}><Text style={styles.eyebrow}>{m.from}</Text><Text style={styles.korean}>{m.text}</Text><Text style={styles.muted}>{m.translation}</Text><TouchableOpacity onPress={()=>speak(m.text)}><Text style={styles.link}>🔊 Listen</Text></TouchableOpacity></Card>)}<TextInput value={chatInput} onChangeText={setChatInput} placeholder="Type a Korean sentence..." placeholderTextColor={C.muted} style={styles.search}/><Button title="Send practice message" onPress={()=>{if(!chatInput.trim())return;const text=chatInput.trim();setMessages(prev=>[...prev,{from:"You",text,translation:"Your practice sentence."},{from:"AI Tutor",text:"좋아요! 계속 연습해 봐요.",translation:"Great! Let's keep practicing."}]);setChatInput("");award(2)}}/></>;

  const renderQuiz = () => <><Header title="Quiz Arena" back/>{quizDone?<Card><Text style={styles.hero}>🎉 Quiz complete!</Text><Text style={styles.cardTitle}>Your score: {quizScore} / {quizItems.length}</Text><Button title="Try again" onPress={()=>{setQuizIndex(0);setQuizScore(0);setQuizDone(false)}}/></Card>:<Card><Text style={styles.eyebrow}>QUESTION {quizIndex+1} / {quizItems.length}</Text><Text style={styles.cardTitle}>{quizItems[quizIndex].q}</Text>{quizItems[quizIndex].opts.map((o,i)=><Button key={o} title={o} secondary onPress={()=>{const correct=i===quizItems[quizIndex].answer;if(!correct)addMistake(quizItems[quizIndex].ko);else setQuizScore(s=>s+1);if(quizIndex===quizItems.length-1){if(correct)award(10);setQuizDone(true)}else setQuizIndex(x=>x+1)}}/> )}</Card>}</>;

  const renderProfile = () => <><Header title="My Mistake DNA" back/><Card><Text style={styles.cardTitle}>Your learning profile</Text><Text style={styles.statNum}>⭐ {xp} XP</Text><Text style={styles.muted}>🔥 {streak} day streak</Text><Text style={styles.body}>Words to review: {mistakes.length}</Text><Text style={styles.muted}>Your weak words are collected when you choose Hard in flashcards or answer a quiz question incorrectly.</Text></Card><Card><Text style={styles.cardTitle}>Review my weaknesses</Text>{mistakes.length===0?<Text style={styles.muted}>No mistakes recorded yet. Complete flashcards and quizzes to build your Mistake DNA.</Text>:mistakes.slice(0,10).map((w,i)=><Text key={i} style={styles.korean}>• {w}</Text>)}<Button title="Practice a 5-question quiz" onPress={()=>go("quiz","Study")}/></Card><Card><Text style={styles.cardTitle}>Profile settings</Text><Text style={styles.body}>Preferred translation: English + Bengali</Text><Text style={styles.body}>Time zone: Korea Standard Time (KST)</Text></Card></>;

  const body = () => {
    switch(screen) {
      case "home": return renderHome();
      case "missions": return renderMissions();
      case "flashcards": return renderFlashcards();
      case "dictionary": return renderDictionary();
      case "social": return renderSocial();
      case "chat": return renderChat();
      case "quiz": return renderQuiz();
      case "profile": return renderProfile();
    }
  };
  const tabs: {name:Tab;icon:string;target:Screen}[] = [
    {name:"Home",icon:"⌂",target:"home"},{name:"Missions",icon:"🧭",target:"missions"},
    {name:"Study",icon:"🃏",target:"flashcards"},{name:"Translate",icon:"文",target:"dictionary"},
    {name:"AI",icon:"🤖",target:"chat"},
  ];
  return <SafeAreaView style={styles.safe}><StatusBar barStyle="light-content" backgroundColor={C.bg}/><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">{body()}<View style={{height:20}}/></ScrollView><View style={styles.nav}>{tabs.map(t=><TouchableOpacity key={t.name} style={styles.navItem} onPress={()=>go(t.target,t.name)}><Text style={[styles.navIcon,tab===t.name&&{color:C.cyan}]}>{t.icon}</Text><Text style={[styles.navText,tab===t.name&&{color:C.cyan}]}>{t.name}</Text></TouchableOpacity>)}</View></SafeAreaView>;
}

const styles=StyleSheet.create({
 safe:{flex:1,backgroundColor:C.bg},content:{padding:18,paddingBottom:28},header:{flexDirection:"row",alignItems:"center",marginBottom:22,marginTop:8},brand:{color:C.cyan,fontSize:12,fontWeight:"800",letterSpacing:2},heading:{color:C.white,fontSize:23,fontWeight:"800",marginTop:3},avatar:{fontSize:25,backgroundColor:C.card,borderRadius:24,padding:9},back:{color:C.cyan,fontSize:34,marginRight:12},card:{backgroundColor:C.card,borderRadius:18,padding:17,marginBottom:13,borderWidth:1,borderColor:"#2B3858"},eyebrow:{color:C.cyan,fontSize:10,fontWeight:"800",letterSpacing:1.5,marginBottom:8},hero:{fontSize:29,color:C.white,fontWeight:"800",marginBottom:5},muted:{color:C.muted,fontSize:13,lineHeight:20},mutedSmall:{color:C.muted,fontSize:11,marginTop:5},stats:{flexDirection:"row",justifyContent:"space-between",marginTop:22},statNum:{color:C.white,fontSize:20,fontWeight:"800"},label:{color:C.white,fontSize:17,fontWeight:"800",marginTop:13,marginBottom:12},grid:{flexDirection:"row",flexWrap:"wrap",justifyContent:"space-between"},tile:{width:"48.5%",backgroundColor:C.card,borderRadius:16,padding:14,marginBottom:10,minHeight:130,borderWidth:1,borderColor:"#2B3858"},tileIcon:{fontSize:26,marginBottom:9},tileTitle:{color:C.white,fontWeight:"800",fontSize:14,marginBottom:5},cardTitle:{color:C.white,fontWeight:"800",fontSize:18,marginBottom:8},body:{color:"#D5DCEC",fontSize:14,lineHeight:21,marginBottom:9},button:{backgroundColor:C.cyan,paddingVertical:13,paddingHorizontal:14,borderRadius:12,alignItems:"center",justifyContent:"center",marginTop:9,flex:1},buttonSecondary:{backgroundColor:"#263653",borderWidth:1,borderColor:C.cyan},buttonText:{color:C.bg,fontWeight:"800",fontSize:13},row:{flexDirection:"row",gap:9,marginBottom:8},link:{color:C.cyan,fontWeight:"700",marginTop:8},phraseRow:{flexDirection:"row",alignItems:"center",paddingVertical:5},korean:{color:C.white,fontSize:21,fontWeight:"800",marginBottom:4},speaker:{fontSize:22,padding:8,color:C.cyan},flashcard:{backgroundColor:C.card,borderRadius:22,borderWidth:2,borderColor:"#334568",minHeight:280,alignItems:"center",justifyContent:"center",padding:24,marginVertical:18},flashKorean:{fontSize:31,color:C.white,fontWeight:"900",textAlign:"center",marginVertical:12},search:{backgroundColor:C.card,color:C.white,borderRadius:13,padding:15,borderWidth:1,borderColor:"#354563",marginBottom:14,fontSize:14},nav:{flexDirection:"row",backgroundColor:"#101B35",borderTopWidth:1,borderTopColor:"#263653",paddingTop:9,paddingBottom:8},navItem:{flex:1,alignItems:"center",gap:3},navIcon:{fontSize:20,color:C.muted},navText:{fontSize:10,color:C.muted,fontWeight:"700"}},
);
