import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, useWindowDimensions, Modal, ScrollView, Alert } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RealPlayer, Match, HistoryRecord } from './types';
import { generateRound, applyRoundResult } from './engine/matchmaker';

const BELL_SOUND = require('../../assets/boxing-bell.mp3');
const BEEP_SOUND = require('../../assets/short-beep.mp3');
const KLAPS_SOUND = require('../../assets/side_stick_1.mp3');
const FINISH_SOUND = require('../../assets/applause.mp3');

export default function App() {
  useKeepAwake();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const [currentScreen, setCurrentScreen] = useState('settings'); 
  const [timeLeft, setTimeLeft] = useState(0); 
  const [isActive, setIsActive] = useState(false); 
  const [phase, setPhase] = useState('PREP'); 
  const [currentRound, setCurrentRound] = useState(1); 

  const [roster, setRoster] = useState<RealPlayer[]>([]);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  
  const [newName, setNewName] = useState('');
  const [newWeight, setNewWeight] = useState('');
  const [newType, setNewType] = useState<'ADULT'|'KID'>('ADULT'); 
  const [newGear, setNewGear] = useState<'GI'|'NO'>('NO'); 
  const [newSkillLevel, setNewSkillLevel] = useState(1); 
  
  const [savedPlayersDB, setSavedPlayersDB] = useState<RealPlayer[]>([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState<RealPlayer[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [roundTime, setRoundTime] = useState('6'); 
  const [restTime, setRestTime] = useState('75');   
  const [roundsTotal, setRoundsTotal] = useState('10'); 

  const [activePlayers, setActivePlayers] = useState<RealPlayer[]>([]);
  const [currentMatches, setCurrentMatches] = useState<Match[]>([]);
  const [currentResting, setCurrentResting] = useState<RealPlayer[]>([]);
  const [isDropoutModalVisible, setIsDropoutModalVisible] = useState(false);

  const [noRestPlayers, setNoRestPlayers] = useState<string[]>([]);
  const [isVipModalVisible, setIsVipModalVisible] = useState(false);
  const [isGoraDolActive, setIsGoraDolActive] = useState(false);

  const historyRef = useRef<Map<string, HistoryRecord>>(new Map());
  const currentMatchesRef = useRef<Match[]>([]);
  const activePlayersRef = useRef<RealPlayer[]>([]);
  const soundsRef = useRef<any>({});
  
  const devModeClickCount = useRef(0);

  useEffect(() => {
    const loadDatabase = async () => {
      try {
        const storedDB = await AsyncStorage.getItem('BJJ_PLAYERS_DB');
        if (storedDB) {
          setSavedPlayersDB(JSON.parse(storedDB).filter((p: any) => p.type !== 'DUMMY'));
        }
      } catch (e) {
        console.log("Błąd ładowania bazy", e);
      }
    };
    loadDatabase();
  }, []);

  const initAudio = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false, playsInSilentModeIOS: true, staysActiveInBackground: true, shouldDuckAndroid: true, 
      });
      const { sound: bell } = await Audio.Sound.createAsync(BELL_SOUND);
      const { sound: beep } = await Audio.Sound.createAsync(BEEP_SOUND);
      const { sound: klaps } = await Audio.Sound.createAsync(KLAPS_SOUND);
      const { sound: finish } = await Audio.Sound.createAsync(FINISH_SOUND);
      soundsRef.current = { bell, warning: beep, tenSec: klaps, finish };
    } catch (e) {
      console.log("BŁĄD AUDIO", e);
    }
  };

  useEffect(() => {
      return () => {
          if (soundsRef.current.bell) soundsRef.current.bell.unloadAsync();
          if (soundsRef.current.warning) soundsRef.current.warning.unloadAsync();
          if (soundsRef.current.tenSec) soundsRef.current.tenSec.unloadAsync();
          if (soundsRef.current.finish) soundsRef.current.finish.unloadAsync();
      }
  }, []);

  const playSound = async (type: 'start' | 'end' | 'warning' | 'tenSeconds' | 'finish') => {
    try {
      let s;
      if (type === 'start' || type === 'end') s = soundsRef.current.bell;
      else if (type === 'warning') s = soundsRef.current.warning;
      else if (type === 'tenSeconds') s = soundsRef.current.tenSec;
      else if (type === 'finish') s = soundsRef.current.finish;
      if (s) {
        await s.replayAsync(); 
        if (type === 'tenSeconds') setTimeout(async () => { try { await s.replayAsync(); } catch(e){} }, 200);
      }
    } catch (error) {}
  };

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      if (timeLeft <= 3) playSound('warning');
      else if (timeLeft === 10 && phase === 'WORK') playSound('tenSeconds');
    }
  }, [timeLeft, isActive, phase]);

  const handleNameChange = (text: string) => {
    setNewName(text);
    if (text.trim().length > 0) {
      const matches = savedPlayersDB.filter(p => p.id.toLowerCase().startsWith(text.toLowerCase()));
      setFilteredSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (player: RealPlayer) => {
    setNewName(player.id);
    setNewWeight(player.weight.toString());
    setNewType(player.type);
    setNewGear(player.gear);
    if (player.skillLevel) setNewSkillLevel(player.skillLevel);
    setShowSuggestions(false);
  };

  const handleEditPlayer = (p: RealPlayer) => {
    setNewName(p.id);
    setNewWeight(p.weight.toString());
    setNewType(p.type);
    setNewGear(p.gear);
    if (p.skillLevel) setNewSkillLevel(p.skillLevel);
    setEditingPlayerId(p.id);
  };

  const handleAddPlayer = async () => {
    if (!newName.trim()) return alert("Podaj pseudonim zawodnika!");
    if (!newWeight.trim() || isNaN(Number(newWeight))) return alert("Podaj prawidłową wagę!");
    
    if (!editingPlayerId && roster.find(p => p.id.toLowerCase() === newName.trim().toLowerCase())) return alert("Zawodnik już dodany!");

    const newPlayer: RealPlayer = {
        id: newName.trim().toUpperCase(),
        type: newType,
        gear: newGear,
        weight: parseFloat(newWeight),
        skillLevel: newType === 'ADULT' ? newSkillLevel : 0,
        restDebt: 0,
        lastRestRound: 0,
        consecutiveMatches: 0,
        helpedKidCount: 0,
        mismatchDebt: 0
    };

    let updatedRoster = [...roster];
    let updatedDB = [...savedPlayersDB];

    if (editingPlayerId) {
        const rosterIdx = updatedRoster.findIndex(p => p.id === editingPlayerId);
        if (rosterIdx >= 0) updatedRoster[rosterIdx] = newPlayer;
        
        const dbIdx = updatedDB.findIndex(p => p.id === editingPlayerId);
        if (dbIdx >= 0) {
            updatedDB[dbIdx] = newPlayer;
        } else {
            const newNameDbIdx = updatedDB.findIndex(p => p.id === newPlayer.id);
            if (newNameDbIdx >= 0) updatedDB[newNameDbIdx] = newPlayer;
            else updatedDB.push(newPlayer);
        }
        setEditingPlayerId(null);
    } else {
        updatedRoster.push(newPlayer);
        const existingDbIndex = updatedDB.findIndex(p => p.id === newPlayer.id);
        if (existingDbIndex >= 0) updatedDB[existingDbIndex] = newPlayer; 
        else updatedDB.push(newPlayer); 
    }

    setRoster(updatedRoster);
    setSavedPlayersDB(updatedDB);
    try { await AsyncStorage.setItem('BJJ_PLAYERS_DB', JSON.stringify(updatedDB)); } catch(e) {}
    
    setNewName(''); 
    setShowSuggestions(false);
  };

  const handleRemoveFromRoster = (id: string) => {
      setRoster(roster.filter(p => p.id !== id));
      setNoRestPlayers(noRestPlayers.filter(pid => pid !== id));
      if (editingPlayerId === id) {
          setEditingPlayerId(null);
          setNewName('');
      }
  };

  const handleClearRoster = () => {
    Alert.alert(
        "Nowy Trening",
        "Czy na pewno chcesz wyczyścić matę z zawodników?",
        [
            { text: "Anuluj", style: "cancel" },
            { text: "Wyczyść", style: "destructive", onPress: () => {
                setRoster([]);
                setNoRestPlayers([]);
                setEditingPlayerId(null);
                setNewName('');
            }}
        ]
    );
  };

  const handleSecretDevMode = () => {
    if (roster.some(p => p.id.startsWith('TEST_'))) {
      setRoster(roster.filter(p => !p.id.startsWith('TEST_')));
      Alert.alert("Dev Mode", "Wyczyszczono testowych zawodników z maty.");
      return;
    }

    const numKids = Math.random() > 0.5 ? 10 : 11;
    const numAdults = Math.random() > 0.5 ? 20 : 21;

    const testPlayers: RealPlayer[] = [];

    for (let i = 0; i < numKids; i++) {
      testPlayers.push({
        id: `TEST_KID_${i + 1}`,
        type: 'KID',
        gear: Math.random() > 0.5 ? 'GI' : 'NO',
        weight: Math.floor(Math.random() * 20 + 25), 
        skillLevel: 0,
        restDebt: 0,
        lastRestRound: 0,
        consecutiveMatches: 0,
        helpedKidCount: 0,
        mismatchDebt: 0
      });
    }

    for (let i = 0; i < numAdults; i++) {
      testPlayers.push({
        id: `TEST_AD_${i + 1}`,
        type: 'ADULT',
        gear: Math.random() > 0.5 ? 'GI' : 'NO',
        weight: Math.floor(Math.random() * 40 + 65), 
        skillLevel: Math.floor(Math.random() * 3 + 1), 
        restDebt: 0,
        lastRestRound: 0,
        consecutiveMatches: 0,
        helpedKidCount: 0,
        mismatchDebt: 0
      });
    }

    setRoster([...roster, ...testPlayers]);
    Alert.alert("Dev Mode Aktywny", `Wylosowano:\n👦 Dzieci: ${numKids}\n🧔 Dorośli: ${numAdults}\nRazem na macie: ${numKids + numAdults}`);
  };

  const handleDevModeTrigger = () => {
    devModeClickCount.current += 1;
    setTimeout(() => {
        devModeClickCount.current = 0;
    }, 2000);
    if (devModeClickCount.current >= 5) {
        devModeClickCount.current = 0;
        handleSecretDevMode();
    }
  };

  const toggleNoRest = (playerId: string) => {
    if (noRestPlayers.includes(playerId)) setNoRestPlayers(noRestPlayers.filter(id => id !== playerId));
    else setNoRestPlayers([...noRestPlayers, playerId]);
  };

  const handleStartTraining = async () => {
    if (roster.length === 0) return alert("Musisz dodać przynajmniej dwóch zawodników!");
    
    await initAudio();

    let freshRoster = roster.map(p => ({...p, restDebt: 0, lastRestRound: 0, consecutiveMatches: 0, helpedKidCount: 0, mismatchDebt: 0}));
    setActivePlayers(freshRoster);
    activePlayersRef.current = freshRoster;
    historyRef.current.clear(); 

    setCurrentScreen('timer');
    setPhase('PREP');
    setTimeLeft(45); 
    setIsActive(true);
    setCurrentRound(1);

    const { matches, resting } = generateRound(freshRoster, historyRef.current, 1, noRestPlayers);
    setCurrentMatches(matches);
    currentMatchesRef.current = matches;
    setCurrentResting(resting);
  };

  const handleStopTraining = () => {
    setIsActive(false);
    setCurrentScreen('settings');
  };

  const handleRemovePlayerFromTraining = (playerId: string) => {
    const updatedPlayers = activePlayersRef.current.filter(p => p.id !== playerId);
    setActivePlayers(updatedPlayers);
    activePlayersRef.current = updatedPlayers;

    const targetRoundNum = phase === 'PREP' ? currentRound : currentRound + 1;
    const { matches, resting } = generateRound(updatedPlayers, historyRef.current, targetRoundNum, noRestPlayers);
    setCurrentMatches(matches);
    currentMatchesRef.current = matches;
    setCurrentResting(resting);
    setIsDropoutModalVisible(false);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => { setTimeLeft(prev => prev - 1); }, 1000);
    } else if (isActive && timeLeft === 0) {
      if (phase === 'PREP') {
        playSound('start'); setPhase('WORK'); setTimeLeft(parseInt(roundTime) * 60); 
        
        const updated = applyRoundResult(currentMatchesRef.current, currentResting, currentRound, historyRef.current, activePlayersRef.current);
        activePlayersRef.current = updated;
        setActivePlayers(updated);

      } else if (phase === 'WORK') {
        if (currentRound < parseInt(roundsTotal)) {
          playSound('end'); setPhase('REST'); setTimeLeft(parseInt(restTime));
          const { matches, resting } = generateRound(activePlayersRef.current, historyRef.current, currentRound + 1, noRestPlayers);
          setCurrentMatches(matches); currentMatchesRef.current = matches; setCurrentResting(resting);
        } else {
          playSound('finish'); 
          setIsActive(false); 
          setCurrentScreen('finished'); 
        }
      } else if (phase === 'REST') {
        const nextRound = currentRound + 1;
        playSound('start'); setPhase('WORK'); setCurrentRound(nextRound); setTimeLeft(parseInt(roundTime) * 60); 
        
        const updated = applyRoundResult(currentMatchesRef.current, currentResting, nextRound, historyRef.current, activePlayersRef.current);
        activePlayersRef.current = updated;
        setActivePlayers(updated);
      }
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isActive, timeLeft, phase, currentRound, roundsTotal, roundTime, restTime]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getTagStyle = (playerObj: RealPlayer) => playerObj.gear === 'NO' ? styles.tagNoGi : styles.tagGi;

  if (currentScreen === 'finished') {
    return (
      <SafeAreaView style={styles.finishedContainer}>
        <Text style={styles.finishedTextBig} adjustsFontSizeToFit={true} numberOfLines={1}>DZIĘKUJĘ</Text>
        <Text style={styles.finishedTextSmall} adjustsFontSizeToFit={true} numberOfLines={1}>ZAPRASZAM POD ŚCIANĘ</Text>
        <TouchableOpacity style={styles.finishedReturnBtn} onPress={() => setCurrentScreen('settings')}>
          <Text style={styles.finishedReturnText}>Wróć do ustawień</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (currentScreen === 'timer') {
    let phaseColor = phase === 'PREP' ? '#eeaa2c' : '#d53256';
    let phaseText = phase === 'PREP' ? 'PRZYGOTOWANIE' : 'PRZERWA';
    const displayRound = phase === 'PREP' ? currentRound : currentRound + 1;

    const kidsPairs = currentMatches.filter(m => m.p1.type === 'KID' && m.p2.type === 'KID');
    const adultsPairs = currentMatches.filter(m => m.p1.type === 'ADULT' && m.p2.type === 'ADULT');
    const mixedPairs = currentMatches.filter(m => m.p1.type !== m.p2.type);

    if (phase === 'WORK') {
      const timerFontSize = Math.min(screenWidth * 0.28, screenHeight * 0.58);
      return (
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.timerContainerGigantic}>
            <Text style={styles.roundInfoGigantic}>RUNDA {currentRound} / {roundsTotal}</Text>
            <View style={styles.clockBoxGigantic}>
              <Text style={[styles.hugeTimerTextGigantic, { fontSize: timerFontSize, lineHeight: timerFontSize * 1.1 }]} adjustsFontSizeToFit={true} numberOfLines={1}>{formatTime(timeLeft)}</Text>
            </View>
            <View style={styles.timerButtonsRowGigantic}>
              <TouchableOpacity style={[styles.controlButtonGigantic, { backgroundColor: isActive ? '#d53256' : '#0693ad' }]} onPress={() => setIsActive(!isActive)}>
                <Text style={styles.controlButtonTextGigantic}>{isActive ? 'PAUZA' : 'WZNÓW'}</Text>
              </TouchableOpacity>
              {!isActive && (
                <TouchableOpacity style={[styles.controlButtonGigantic, { backgroundColor: '#d53256', opacity: 0.9 }]} onPress={() => setIsDropoutModalVisible(true)}>
                  <Text style={styles.controlButtonTextGigantic}>KTOŚ WYPADŁ?</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.controlButtonGigantic, { backgroundColor: '#d53256' }]} onPress={handleStopTraining}>
                <Text style={styles.controlButtonTextGigantic}>ZAKOŃCZ</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Modal visible={isDropoutModalVisible} transparent={true} animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>KTO WYPADŁ Z TRENINGU?</Text>
                <ScrollView style={{width: '100%'}}>
                  {activePlayers.map((p) => (
                    <View key={p.id} style={styles.modalRow}>
                      <Text style={[styles.modalPlayerText, getTagStyle(p)]}>{p.id}</Text>
                      <TouchableOpacity style={styles.removeButton} onPress={() => handleRemovePlayerFromTraining(p.id)}><Text style={styles.removeButtonText}>USUŃ</Text></TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
                <TouchableOpacity style={styles.closeModalButton} onPress={() => setIsDropoutModalVisible(false)}><Text style={styles.closeModalButtonText}>ZAMKNIJ</Text></TouchableOpacity>
              </View>
            </View>
          </Modal>
        </SafeAreaView>
      );
    }

    const MAX_ROWS = 5; 
    let kidsCols = Math.ceil(kidsPairs.length / MAX_ROWS) || 1;
    let adultsCols = Math.ceil(adultsPairs.length / MAX_ROWS) || 1;

    let kidsFlex = kidsPairs.length > 0 ? kidsCols : 0;
    let adultsFlex = adultsPairs.length > 0 ? adultsCols : 0;
    if (kidsFlex === 0 && adultsFlex === 0) { kidsFlex = 1; adultsFlex = 1; }
    else if (kidsFlex === 0) adultsFlex = 1;
    else if (adultsFlex === 0) kidsFlex = 1;

    const kidsRows = Math.ceil(kidsPairs.length / kidsCols) || 1;
    const adultsRows = Math.ceil(adultsPairs.length / adultsCols) || 1;

    const maxGridHeight = Math.max(400, screenHeight - 350); 
    const dynamicKidsFont = Math.max(24, Math.min(90, (maxGridHeight / kidsRows) * 0.35));
    const dynamicAdultsFont = Math.max(24, Math.min(90, (maxGridHeight / adultsRows) * 0.35));

    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.topBarRound}>RUNDA {displayRound} / {roundsTotal}</Text>
            <Text style={[styles.topBarPhase, { color: phaseColor }]}>{phaseText}</Text>
          </View>
          <View style={[styles.topBarTimerBox, { borderColor: phaseColor }]}>
            <Text style={[styles.topBarTimer, { color: phaseColor }]}>{formatTime(timeLeft)}</Text>
          </View>
        </View>

        <View style={styles.matchmakingMainContainer}>
          <View style={styles.splitMainArea}>
            
            {kidsPairs.length > 0 && (
              <View style={[styles.sideSection, { flex: kidsFlex }]}>
                <Text style={styles.sectionTitleDZ}>KID</Text>
                <View style={styles.gridWrap}>
                    {kidsPairs.map((match: any, index: number) => {
                      const remainder = kidsPairs.length % kidsCols;
                      const isLastRow = remainder !== 0 && index >= kidsPairs.length - remainder;
                      const cellWidth = isLastRow ? `${100 / remainder}%` : `${100 / kidsCols}%`;

                      return (
                        <View key={`dz-${index}`} style={{ width: cellWidth as any, height: `${100/kidsRows}%`, padding: 4 }}>
                            <View style={styles.matchCard}>
                              <Text style={{ fontSize: dynamicKidsFont, fontWeight: 'bold', textAlign: 'center' }} adjustsFontSizeToFit={true} numberOfLines={2}>
                                <Text style={getTagStyle(match.p1)}>{match.p1.id}</Text>
                                <Text style={styles.vsText}> vs </Text>
                                <Text style={getTagStyle(match.p2)}>{match.p2.id}</Text>
                              </Text>
                              {isGoraDolActive && <Text style={[styles.goraDolText, {fontSize: dynamicKidsFont * 0.35}]}>(dół) vs (góra)</Text>}
                            </View>
                        </View>
                      );
                    })}
                </View>
              </View>
            )}

            {kidsPairs.length > 0 && adultsPairs.length > 0 && <View style={styles.verticalDivider} />}

            {adultsPairs.length > 0 && (
              <View style={[styles.sideSection, { flex: adultsFlex }]}>
                <Text style={styles.sectionTitleDO}>ADULT</Text>
                <View style={styles.gridWrap}>
                    {adultsPairs.map((match: any, index: number) => {
                      const remainder = adultsPairs.length % adultsCols;
                      const isLastRow = remainder !== 0 && index >= adultsPairs.length - remainder;
                      const cellWidth = isLastRow ? `${100 / remainder}%` : `${100 / adultsCols}%`;

                      return (
                        <View key={`do-${index}`} style={{ width: cellWidth as any, height: `${100/adultsRows}%`, padding: 4 }}>
                            <View style={styles.matchCard}>
                              <Text style={{ fontSize: dynamicAdultsFont, fontWeight: 'bold', textAlign: 'center' }} adjustsFontSizeToFit={true} numberOfLines={2}>
                                <Text style={getTagStyle(match.p1)}>{match.p1.id}</Text>
                                <Text style={styles.vsText}> vs </Text>
                                <Text style={getTagStyle(match.p2)}>{match.p2.id}</Text>
                              </Text>
                              {isGoraDolActive && <Text style={[styles.goraDolText, {fontSize: dynamicAdultsFont * 0.35}]}>(dół) vs (góra)</Text>}
                            </View>
                        </View>
                      );
                    })}
                </View>
              </View>
            )}
          </View>

          {mixedPairs.length > 0 && (
            <View style={styles.mixedContainerMath}>
              <Text style={styles.mixedTitleMath}>MIESZANE:</Text>
              <View style={styles.mixedWrapMath}>
                {mixedPairs.map((match: any, index: number) => (
                  <View key={`mix-${index}`} style={styles.mixedMatchCard}>
                    <Text style={{ fontSize: 35, fontWeight: 'bold', textAlign: 'center' }} adjustsFontSizeToFit={true} numberOfLines={2}>
                      <Text style={getTagStyle(match.p1)}>{match.p1.id}</Text>
                      <Text style={styles.vsText}> vs </Text>
                      <Text style={getTagStyle(match.p2)}>{match.p2.id}</Text>
                    </Text>
                    {isGoraDolActive && <Text style={[styles.goraDolText, {fontSize: 16}]}>(dół) vs (góra)</Text>}
                  </View>
                ))}
              </View>
            </View>
          )}

          {currentResting.length > 0 && (
            <View style={styles.restingContainerMath}>
              <Text style={styles.restingTitleMath}>ODPOCZYWA:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                {currentResting.map((playerObj, idx) => (
                  <View key={idx} style={styles.restingBadge}>
                    <Text style={[styles.restingPlayerTextMath, getTagStyle(playerObj)]}>{playerObj.id}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        <View style={styles.bottomButtonsBar}>
           <TouchableOpacity style={[styles.controlButtonSmall, { backgroundColor: isActive ? '#d53256' : '#0693ad' }]} onPress={() => setIsActive(!isActive)}>
              <Text style={styles.controlButtonTextSmall}>{isActive ? 'PAUZA' : 'WZNÓW'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.controlButtonSmall, { backgroundColor: '#d53256', opacity: 0.9 }]} onPress={() => setIsDropoutModalVisible(true)}>
              <Text style={styles.controlButtonTextSmall}>KTOŚ WYPADŁ?</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.controlButtonSmall, { backgroundColor: '#d53256' }]} onPress={handleStopTraining}>
              <Text style={styles.controlButtonTextSmall}>ZAKOŃCZ</Text>
            </TouchableOpacity>
        </View>

        <Modal visible={isDropoutModalVisible} transparent={true} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>KTO WYPADŁ Z TRENINGU?</Text>
              <ScrollView style={{width: '100%'}}>
                {activePlayers.map((p) => (
                  <View key={p.id} style={styles.modalRow}>
                    <Text style={[styles.modalPlayerText, getTagStyle(p)]}>{p.id}</Text>
                    <TouchableOpacity style={styles.removeButton} onPress={() => handleRemovePlayerFromTraining(p.id)}><Text style={styles.removeButtonText}>USUŃ</Text></TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
              <TouchableOpacity style={styles.closeModalButton} onPress={() => setIsDropoutModalVisible(false)}><Text style={styles.closeModalButtonText}>ZAMKNIJ</Text></TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // ==========================================
  // WIDOK 1: EKRAN REJESTRACJI 
  // ==========================================
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        
        <View style={styles.contentSplit}>
          <View style={styles.leftCol}>
            <View style={styles.sectionBox}>
              <TouchableOpacity activeOpacity={0.6} onPress={handleDevModeTrigger}>
                <Text style={styles.sectionTitle}>DODAJ ZAWODNIKA</Text>
              </TouchableOpacity>
              
              <Text style={styles.label}>Pseudonim:</Text>
              <View style={{ zIndex: 10 }}>
                <TextInput 
                    style={styles.inputText} 
                    value={newName} 
                    onChangeText={handleNameChange} 
                    placeholder="np. Kowalski" 
                    placeholderTextColor="rgba(255, 255, 255, 0.3)" 
                    autoCorrect={false}
                />
                
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <View style={[styles.suggestionsBox, { zIndex: 999 }]}>
                    <ScrollView style={{ maxHeight: 150 }} keyboardShouldPersistTaps="handled">
                      {filteredSuggestions.map((sugg, idx) => (
                        <TouchableOpacity key={idx} style={styles.suggestionItem} onPress={() => handleSelectSuggestion(sugg)}>
                          <Text style={styles.suggestionName}>{sugg.id}</Text>
                          <Text style={styles.suggestionDetail}>{sugg.weight} kg | {sugg.type} {sugg.gear}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
              
              <Text style={styles.label}>Waga (kg):</Text>
              <TextInput style={styles.inputText} keyboardType="numeric" value={newWeight} onChangeText={setNewWeight} placeholder="np. 82" placeholderTextColor="rgba(255, 255, 255, 0.3)" />
              
              <View style={styles.togglesRow}>
                <TouchableOpacity style={[styles.toggleBtn, newType === 'KID' && styles.toggleActiveKid]} onPress={() => setNewType('KID')}><Text style={[styles.toggleText, newType === 'KID' && styles.toggleTextActive]}>KID</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.toggleBtn, newType === 'ADULT' && styles.toggleActiveAdult]} onPress={() => setNewType('ADULT')}><Text style={[styles.toggleText, newType === 'ADULT' && styles.toggleTextActive]}>ADULT</Text></TouchableOpacity>
              </View>

              <View style={styles.togglesRow}>
                <TouchableOpacity style={[styles.toggleBtn, newGear === 'GI' && styles.toggleActiveGi]} onPress={() => setNewGear('GI')}><Text style={[styles.toggleText, newGear === 'GI' && styles.toggleTextActive]}>GI</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.toggleBtn, newGear === 'NO' && styles.toggleActiveNoGi]} onPress={() => setNewGear('NO')}><Text style={[styles.toggleText, newGear === 'NO' && styles.toggleTextActive]}>NO-GI</Text></TouchableOpacity>
              </View>

              {newType === 'ADULT' && (
                <View style={styles.togglesRow}>
                  <TouchableOpacity style={[styles.toggleBtn, newSkillLevel === 1 && styles.toggleActiveSkill]} onPress={() => setNewSkillLevel(1)}>
                      <Text style={[styles.toggleText, newSkillLevel === 1 && styles.toggleTextActive]}>POCZ.</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.toggleBtn, newSkillLevel === 2 && styles.toggleActiveSkill]} onPress={() => setNewSkillLevel(2)}>
                      <Text style={[styles.toggleText, newSkillLevel === 2 && styles.toggleTextActive]}>ŚREDNI</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.toggleBtn, newSkillLevel === 3 && styles.toggleActiveSkill]} onPress={() => setNewSkillLevel(3)}>
                      <Text style={[styles.toggleText, newSkillLevel === 3 && styles.toggleTextActive]}>PRO</Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity style={styles.addButton} onPress={handleAddPlayer}>
                  <Text style={styles.addButtonText}>{editingPlayerId ? 'ZAPISZ ZMIANY' : 'DODAJ ZAWODNIKA'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sectionBox}>
              <Text style={styles.sectionTitle}>CZAS</Text>
              <View style={styles.row}>
                <View style={styles.thirdWidth}><Text style={styles.label}>Runda (min):</Text><TextInput style={styles.inputNumber} keyboardType="numeric" value={roundTime} onChangeText={setRoundTime} /></View>
                <View style={styles.thirdWidth}><Text style={styles.label}>Przerwa (s):</Text><TextInput style={styles.inputNumber} keyboardType="numeric" value={restTime} onChangeText={setRestTime} /></View>
                <View style={styles.thirdWidth}><Text style={styles.label}>Rund:</Text><TextInput style={styles.inputNumber} keyboardType="numeric" value={roundsTotal} onChangeText={setRoundsTotal} /></View>
              </View>
            </View>
            
            <View style={styles.optionsRow}>
              <TouchableOpacity style={styles.vipButton} onPress={() => setIsVipModalVisible(true)}><Text style={styles.vipButtonText}>BEZ PAUZY</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.vipButton, isGoraDolActive && styles.vipButtonActive]} onPress={() => setIsGoraDolActive(!isGoraDolActive)}><Text style={[styles.vipButtonText, isGoraDolActive && {color: '#13181f'}]}>GÓRA / DÓŁ</Text></TouchableOpacity>
            </View>
            
            <TouchableOpacity style={styles.startButton} onPress={handleStartTraining}>
                <Text style={styles.startButtonText}>START SPARINGÓW</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.rightCol}>
             <View style={[styles.sectionBox, { flex: 1, marginBottom: 0 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>ZAWODNICY NA MACIE ({roster.length})</Text>
                    {roster.length > 0 && (
                        <TouchableOpacity style={styles.clearMataBtn} onPress={handleClearRoster}>
                            <Text style={styles.clearMataText}>NOWY TRENING</Text>
                        </TouchableOpacity>
                    )}
                </View>
                <ScrollView style={{flex: 1}}>
                    {roster.map((p, idx) => {
                        let skillText = "";
                        if (p.type === 'ADULT') {
                            if (p.skillLevel === 1) skillText = " | POCZ.";
                            if (p.skillLevel === 2) skillText = " | ŚREDNI";
                            if (p.skillLevel === 3) skillText = " | PRO";
                        }
                        return (
                            <TouchableOpacity key={idx} style={styles.rosterRow} onPress={() => handleEditPlayer(p)}>
                                <View>
                                    <Text style={[styles.rosterName, getTagStyle(p)]}>{p.id}</Text>
                                    <Text style={styles.rosterDetails}>{p.type} | {p.weight} kg{skillText}</Text>
                                </View>
                                <TouchableOpacity style={styles.rosterDeleteBtn} onPress={(e) => { e.stopPropagation(); handleRemoveFromRoster(p.id); }}>
                                    <Text style={styles.rosterDeleteText}>X</Text>
                                </TouchableOpacity>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
             </View>
          </View>
        </View>

        <Modal visible={isVipModalVisible} transparent={true} animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>ZAWODNICY BEZ PAUZY</Text>
              <ScrollView style={{width: '100%'}}>
                <View style={styles.vipGrid}>
                  {roster.map((p) => {
                    const isVip = noRestPlayers.includes(p.id);
                    return (
                      <TouchableOpacity key={p.id} style={[styles.vipPlayerBox, isVip && styles.vipPlayerBoxActive]} onPress={() => toggleNoRest(p.id)}>
                        <Text style={[styles.vipPlayerText, getTagStyle(p), isVip && {color: '#13181f'}]}>{p.id}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
              <TouchableOpacity style={styles.closeModalButton} onPress={() => setIsVipModalVisible(false)}><Text style={styles.closeModalButtonText}>GOTOWE</Text></TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#13181f' }, 
  container: { flexGrow: 1, padding: 10 },
  
  finishedContainer: { flex: 1, backgroundColor: '#13181f', justifyContent: 'center', alignItems: 'center', padding: 20 },
  finishedTextBig: { fontSize: 130, fontWeight: '900', color: '#eeaa2c', textAlign: 'center', marginBottom: 20, textShadowColor: 'rgba(238, 170, 44, 0.4)', textShadowOffset: {width: 0, height: 0}, textShadowRadius: 20 },
  finishedTextSmall: { fontSize: 60, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center' },
  finishedReturnBtn: { position: 'absolute', bottom: 30, paddingVertical: 10, paddingHorizontal: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  finishedReturnText: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: 'bold' },

  contentSplit: { flex: 1, flexDirection: 'row', width: '100%', gap: 15, marginTop: 5 },
  leftCol: { flex: 1, maxWidth: 500, zIndex: 10 },
  rightCol: { flex: 1 },

  sectionBox: { backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: 10, borderRadius: 15, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  sectionTitle: { color: '#0693ad', fontSize: 16, fontWeight: 'bold', marginBottom: 6, textAlign: 'center', letterSpacing: 1 }, 
  label: { color: '#FFFFFF', fontSize: 13, marginBottom: 2, marginTop: 2, fontWeight: 'bold' },
  
  inputText: { backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#FFFFFF', fontSize: 16, padding: 8, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)' },
  
  suggestionsBox: { position: 'absolute', top: 45, left: 0, right: 0, backgroundColor: '#1e2430', borderRadius: 8, borderWidth: 2, borderColor: '#0693ad', elevation: 5, shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.5, shadowRadius: 4 },
  suggestionItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.1)' },
  suggestionName: { color: '#eeaa2c', fontSize: 18, fontWeight: 'bold' },
  suggestionDetail: { color: 'rgba(255, 255, 255, 0.6)', fontSize: 12, marginTop: 2 },

  inputNumber: { backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#FFFFFF', fontSize: 16, padding: 8, borderRadius: 10, textAlign: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)' },
  
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  thirdWidth: { width: '31%' },
  
  togglesRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 4 },
  toggleBtn: { flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: 8, borderRadius: 10, alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255, 255, 255, 0.15)' },
  toggleActiveKid: { backgroundColor: '#eeaa2c', borderColor: '#eeaa2c' }, 
  toggleActiveAdult: { backgroundColor: '#eeaa2c', borderColor: '#eeaa2c' },
  toggleActiveGi: { backgroundColor: '#0693ad', borderColor: '#0693ad' }, 
  toggleActiveNoGi: { backgroundColor: '#eeaa2c', borderColor: '#eeaa2c' }, 
  toggleActiveSkill: { backgroundColor: '#0693ad', borderColor: '#0693ad' }, 
  toggleText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
  toggleTextActive: { color: '#13181f' }, 

  addButton: { backgroundColor: '#0693ad', padding: 10, borderRadius: 10, marginTop: 8, alignItems: 'center' }, 
  addButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },

  rosterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  rosterName: { fontSize: 20, fontWeight: 'bold' },
  rosterDetails: { fontSize: 13, color: 'rgba(255, 255, 255, 0.6)', marginTop: 3 },
  rosterDeleteBtn: { backgroundColor: '#d53256', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' }, 
  rosterDeleteText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },

  clearMataBtn: { backgroundColor: '#d53256', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  clearMataText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },

  optionsRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 6, gap: 10 },
  vipButton: { flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.05)', paddingVertical: 10, borderRadius: 10, alignItems: 'center', borderWidth: 2, borderColor: '#0693ad' },
  vipButtonActive: { backgroundColor: '#0693ad', borderColor: '#0693ad' },
  vipButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold', textAlign: 'center' },
  
  startButton: { backgroundColor: '#eeaa2c', paddingVertical: 12, borderRadius: 15, marginTop: 5, alignItems: 'center' }, 
  startButtonText: { color: '#13181f', fontSize: 20, fontWeight: 'bold' }, 
  
  tagGi: { color: '#0693ad', fontWeight: 'bold' }, 
  tagNoGi: { color: '#eeaa2c', fontWeight: 'bold' }, 
  
  vipGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  vipPlayerBox: { backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: 15, margin: 5, borderRadius: 10, borderWidth: 2, borderColor: 'rgba(255, 255, 255, 0.1)' },
  vipPlayerBoxActive: { backgroundColor: '#0693ad', borderColor: '#0693ad' },
  vipPlayerText: { fontSize: 18, fontWeight: 'bold' },
  
  timerContainerGigantic: { flex: 1, justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#13181f', paddingVertical: 10 },
  roundInfoGigantic: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 30, fontWeight: 'bold', textAlign: 'center', marginTop: 10 },
  clockBoxGigantic: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%', paddingHorizontal: 10 },
  hugeTimerTextGigantic: { color: '#FFFFFF', fontWeight: 'bold', fontFamily: 'monospace', textAlign: 'center' },
  timerButtonsRowGigantic: { flexDirection: 'row', width: '95%', justifyContent: 'space-between', marginBottom: 10, backgroundColor: 'rgba(0, 0, 0, 0.3)', padding: 10, borderRadius: 20 },
  controlButtonGigantic: { paddingVertical: 20, borderRadius: 15, flex: 1, marginHorizontal: 5, alignItems: 'center' },
  controlButtonTextGigantic: { color: '#FFFFFF', fontSize: 30, fontWeight: 'bold' },
  
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: 'rgba(0,0,0,0.2)', borderBottomWidth: 2, borderBottomColor: 'rgba(255, 255, 255, 0.05)' },
  topBarRound: { color: '#FFFFFF', fontSize: 36, fontWeight: 'bold', marginBottom: 5 },
  topBarPhase: { fontSize: 50, fontWeight: '900', letterSpacing: 2 },
  topBarTimerBox: { backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 35, paddingVertical: 10, borderRadius: 20, borderWidth: 4, justifyContent: 'center' },
  topBarTimer: { fontSize: 100, fontWeight: 'bold', fontFamily: 'monospace' },
  
  matchmakingMainContainer: { flex: 1 },
  matchmakingContentContainer: { flexGrow: 1, padding: 10, justifyContent: 'space-between', paddingBottom: 15 },
  splitMainArea: { flex: 1, flexDirection: 'row', width: '100%' },
  sideSection: { paddingHorizontal: 5, flexDirection: 'column' },
  gridWrap: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignContent: 'flex-start' },
  verticalDivider: { width: 4, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 2, marginHorizontal: 5 },
  
  sectionTitleDZ: { color: '#0693ad', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 2 },
  sectionTitleDO: { color: '#0693ad', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 2 },

  matchCard: { flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 15 },
  vsText: { color: 'rgba(255, 255, 255, 0.4)' },
  goraDolText: { color: 'rgba(255, 255, 255, 0.5)', marginTop: 2, fontWeight: 'bold', textAlign: 'center' },
  
  mixedContainerMath: { width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 12, borderWidth: 2, borderColor: '#eeaa2c', paddingHorizontal: 10, paddingVertical: 5, marginTop: 5, flexDirection: 'row', alignItems: 'center' },
  mixedTitleMath: { color: '#eeaa2c', fontSize: 16, fontWeight: 'bold', letterSpacing: 1, marginRight: 10 },
  mixedWrapMath: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  mixedMatchCard: { flexGrow: 1, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 8, paddingVertical: 15, paddingHorizontal: 15, margin: 4, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', justifyContent: 'center' },
  
  restingContainerMath: { width: '100%', backgroundColor: 'rgba(213, 50, 86, 0.1)', borderRadius: 12, borderWidth: 2, borderColor: '#d53256', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, marginTop: 5 },
  restingTitleMath: { color: '#d53256', fontSize: 16, fontWeight: 'bold', letterSpacing: 1, marginRight: 10 },
  restingBadge: { backgroundColor: 'rgba(255, 255, 255, 0.05)', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 10, marginRight: 10, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  restingPlayerTextMath: { fontSize: 20, fontWeight: 'bold' },
  
  bottomButtonsBar: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 10, backgroundColor: 'rgba(0, 0, 0, 0.2)', borderTopWidth: 2, borderTopColor: 'rgba(255, 255, 255, 0.05)' },
  controlButtonSmall: { paddingVertical: 15, paddingHorizontal: 20, borderRadius: 15, marginHorizontal: 10, minWidth: 150, alignItems: 'center' },
  controlButtonTextSmall: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', maxHeight: '80%', backgroundColor: '#13181f', padding: 20, borderRadius: 20, borderWidth: 2, borderColor: '#0693ad', alignItems: 'center' },
  modalTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  modalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: 15, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  modalPlayerText: { fontSize: 24, fontWeight: 'bold' },
  removeButton: { backgroundColor: '#d53256', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  removeButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  closeModalButton: { backgroundColor: 'rgba(255, 255, 255, 0.1)', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 15, marginTop: 20 },
  closeModalButtonText: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' }
});