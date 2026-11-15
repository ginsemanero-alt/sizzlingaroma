import { useState } from 'react';
import { HouseGround, HouseShell, Yard, FRONT_DOOR, UPSTAIRS_DOOR } from '../shared/house';
import { Door, setDoor } from '../../components/Environment/Door';
import { HouseLight } from '../../components/Environment/HouseLight';
import { Rain, Lightning } from '../../components/Environment/Atmosphere';
import {
  Sofa, Table, Chair, Bookshelf, CRT, FloorLamp, Rug, Frame, Counter, Stove, Fridge, Calendar, FuseBox,
  AnsweringMachine, Dresser, KeyProp, Battery, PaperNote, Crates, Candle, B,
} from '../../components/Environment/Props';
import { Interactable } from '../../components/Interactions/Interactable';
import { Trigger } from '../../components/Interactions/Trigger';
import { useChapterScript } from '../../systems/ChapterSystem/useChapterScript';
import { completeObjective, completeChapter, isObjectiveDone } from '../../systems/ChapterSystem/chapterRuntime';
import { say, choose } from '../../systems/DialogueSystem/dialogue';
import { giveItem, hasItem, inspectItem } from '../../systems/InventorySystem/inventory';
import { setAmbience, play } from '../../systems/AudioSystem/audioManager';
import { wait } from '../../systems/ChapterSystem/clock';
import { teleport, rig } from '../../components/Player/playerRig';
import { setLights, setLight, flickerLights, footstepTrail, setAmbientEvents, sting, flickerFlashlight } from '../../systems/HorrorEventSystem/horror';
import { showFigure } from '../../components/Enemies/figureDirector';
import { useGame } from '../../store/gameStore';
import { ITEMS } from '../../data/items';

export default function Chapter1() {
  const [upstairsLit, setUpstairsLit] = useState(false);
  const [power, setPower] = useState(false);
  const [photoFallen, setPhotoFallen] = useState(false);
  const [photoTaken, setPhotoTaken] = useState(false);
  const [keyTaken, setKeyTaken] = useState(() => hasItem('key_noah'));
  const [batteryTaken, setBatteryTaken] = useState(false);
  const [voicemailHeard, setVoicemailHeard] = useState(false);
  const [closetOpen, setClosetOpen] = useState(false);
  const looped = !!useGame.getState().flags.looped;

  useChapterScript(async () => {
    useGame.getState().setHint('Press F to switch on your flashlight');
    setTimeout(() => useGame.getState().setHint(null), 7000);
    await say(looped ? 'c1_intro_loop' : 'c1_intro');
  });

  // initial placement + ambience (runs before the intro fades in)
  useState(() => {
    teleport(2.25, 18.2, 0);
    rig.surface = 'outside';
    setAmbience({ rain: 0.75, wind: 0.35, insects: 0.12, drone_low: 0.22 }, 2);
    return 0;
  });

  const goInside = () => {
    if (isObjectiveDone('enter')) return;
    completeObjective('enter');
    rig.surface = 'wood';
    setAmbience({ rain_inside: 0.7, wind: 0.15, roomtone: 0.35, drone_low: 0.28 }, 3);
    say('c1_enter');
  };

  const restorePower = async () => {
    if (power) return;
    play('click', { vol: 0.9, rate: 0.7, pos: [-7.8, 1.5, -6.8] });
    await wait(0.3);
    play('buzz', { vol: 0.15, loop: false, pos: [-7.8, 1.5, -6.8] });
    setPower(true);
    setLights('ground', true);
    flickerLights('ground', 1.4);
    completeObjective('power');
    setAmbience({ rain_inside: 0.65, wind: 0.12, roomtone: 0.35, buzz: 0.05, drone_low: 0.28 }, 2);
    await say('c1_power_on');
    await say('c1_machine_blink');
    setAmbientEvents({ minGap: 22, maxGap: 45, pool: ['creak', 'creak', 'thunder', 'flicker', 'steps', 'knock'] });
  };

  const playVoicemail = async () => {
    if (voicemailHeard) {
      say(ITEMS.voicemail.tape!, { interrupt: true });
      return;
    }
    setVoicemailHeard(true);
    useGame.getState().setCutscene(true);
    play('machine_beep', { pos: [2.0, 1.0, -3], vol: 0.6 });
    await wait(0.6);
    play('kuya_tape', { pos: [2.0, 1.0, -3], vol: 0.8 });
    await say(ITEMS.voicemail.tape!);
    giveItem('voicemail');
    completeObjective('voicemail');
    useGame.getState().setCutscene(false);
    await say(looped ? 'c1_after_voicemail_loop' : 'c1_after_voicemail');
    await wait(1.5);
    footstepTrail([-4, 3.0, 1], [5, 3.0, -2], 9, 0.62, 'step_figure', 0.9);
    flickerLights('ground', 1.2);
    await say('c1_footsteps_above');
    await wait(4);
    play('glass', { pos: [-6, 1.5, -2.6], vol: 0.6 });
    play('impact', { pos: [-6, 1, -2.6], vol: 0.4 });
    setPhotoFallen(true);
    await say('c1_photo_fall');
  };

  const takePhoto = async () => {
    setPhotoTaken(true);
    const c = await choose('A framed photograph lies face-down in broken glass.', [
      { id: 'look', text: 'Turn it over and look at it' },
      { id: 'away', text: 'Leave it face-down. Pocket it without looking.' },
    ]);
    giveItem('photo_porch');
    completeObjective('photo');
    if (c === 'look') {
      inspectItem('photo_porch');
      await say('c1_photo_look');
    } else {
      useGame.getState().addAvoidance();
      await say('c1_photo_away');
    }
    await wait(2.5);
    flickerLights('ground', 2);
    flickerFlashlight(1.2);
    setDoor('closet', true, { slow: true });
    setClosetOpen(true);
    await say('c1_closet_open');
  };

  const takeKey = async () => {
    setKeyTaken(true);
    giveItem('key_noah');
    completeObjective('key');
    await say('c1_key');
  };

  const goUpstairs = async () => {
    if (!hasItem('key_noah')) {
      say('c1_stairs_locked', { interrupt: true });
      return;
    }
    completeObjective('upstairs');
    play('door_creak', { pos: [6.8, 4, -6], vol: 0.7 });
    await completeChapter(2);
  };

  return (
    <>
      <color attach="background" args={['#05070b']} />
      <fog attach="fog" args={['#070a10', 6, 42]} />
      <hemisphereLight args={['#4a5a78', '#1a140e', 0.9]} />
      <ambientLight color="#20242c" intensity={0.5} />
      <directionalLight position={[-12, 18, 10]} color="#7a8aaa" intensity={0.45} />
      <Lightning />

      <Yard />
      <HouseShell litWindow={upstairsLit} />
      <HouseGround />
      <Rain bounds={{ minX: -30, maxX: 30, minZ: 4.4, maxZ: 30 }} count={4000} />

      {/* ── lights ── */}
      <HouseLight id="living" group="ground" pos={[-3.5, 2.45, 0.5]} on={false} fixture="bulb" intensity={5} unstable={0.15} shadow />
      <HouseLight id="hall" group="ground" pos={[2.25, 2.45, -2]} on={false} fixture="bulb" intensity={4} />
      <HouseLight id="kitchen" group="ground" pos={[-3.5, 2.5, -5.5]} on={false} fixture="shade" intensity={5} />
      <HouseLight id="stairhall" group="ground" pos={[5, 5.4, -0.5]} on={false} fixture="bulb" intensity={6} distance={12} />
      <HouseLight id="upstairs" group="upstairs" pos={[-4, 4.1, 3.2]} on={false} fixture="none" intensity={4} color="#ffb860" distance={7} />

      {/* ── doors ── */}
      <Door id="front" pos={[FRONT_DOOR[0], 0, FRONT_DOOR[2]]} axis="x" width={1.0} swing={-1} onOpen={() => play('creak_1', { pos: [2.25, 1.2, 4], vol: 0.6 })} />
      <Door id="kitchen" pos={[1, 0, -5.5]} axis="z" swing={1} startOpen />
      <Door id="closet" pos={[3.5, 0, -7]} axis="z" width={0.9} swing={-1} canOpen={() => (isObjectiveDone('photo') ? true : 'It\'s stuck. The wood has swollen shut.')} />
      <Door id="upstairs" pos={[UPSTAIRS_DOOR[0], 2.9, UPSTAIRS_DOOR[2]]} axis="x" width={1.0} scripted />

      {/* ── living room ── */}
      <Rug pos={[-3.5, 0, 0.6]} w={3.2} d={2.2} />
      <Sofa pos={[-3.5, 0, 2.6]} rot={Math.PI} />
      <Table pos={[-3.5, 0, 0.8]} w={1.1} d={0.6} h={0.42} />
      <CRT pos={[-3.5, 0, -2.45]} />
      <Bookshelf pos={[-7.75, 0, -0.6]} rot={Math.PI / 2} />
      <FloorLamp pos={[-6.8, 0, 3.3]} />
      <Dresser pos={[-0.2, 0, -2.6]} w={1.2} />
      <Frame pos={[-6, 1.6, -2.88]} tint="#8a7356" />
      <Frame pos={[-1.6, 1.7, 3.88]} rot={Math.PI} tint="#5a6b78" w={0.5} h={0.35} />
      {!photoTaken && <Frame pos={[-6, 0.03, -2.4]} tint="#8a7356" fallen={photoFallen} />}
      <Interactable
        id="photo"
        at={[-6, 0.15, -2.4]}
        prompt="Pick up the photograph"
        enabled={photoFallen && !photoTaken}
        glint
        onInteract={takePhoto}
      />
      {!batteryTaken && <Battery pos={[-0.2, 0.93, -2.6]} />}
      <Interactable
        id="battery1"
        at={[-0.2, 0.95, -2.6]}
        prompt="Take batteries"
        enabled={!batteryTaken}
        onInteract={() => {
          setBatteryTaken(true);
          const g = useGame.getState();
          g.setBattery(g.battery + 45);
          g.pushToast('Flashlight batteries +45%', 'item');
          play('click', { vol: 0.6 });
        }}
      />

      {/* ── kitchen ── */}
      <Counter pos={[-5.6, 0, -7.65]} w={3.6} sink />
      <Stove pos={[-2.9, 0, -7.65]} />
      <Fridge pos={[-1.2, 0, -7.6]} />
      <Table pos={[-4.5, 0, -4.6]} w={1.3} d={0.9} />
      <Chair pos={[-5.3, 0, -4.6]} rot={-Math.PI / 2} />
      <Chair pos={[-3.7, 0, -4.4]} rot={Math.PI / 2} fallen />
      <Candle pos={[-4.6, 0.78, -4.5]} lit={false} />
      <Calendar pos={[-7.88, 1.6, -3.9]} rot={Math.PI / 2} />
      <Interactable
        id="calendar"
        at={[-7.85, 1.6, -3.9]}
        prompt="Look at the calendar"
        glint
        onInteract={() => {
          giveItem('clue_calendar');
          inspectItem('clue_calendar');
        }}
      />
      <PaperNote pos={[-1.2, 1.3, -7.24]} color="#d7c48a" w={0.24} h={0.18} />
      <Interactable
        id="fridge_drawing"
        at={[-1.2, 1.3, -7.2]}
        prompt="Look at the drawing on the fridge"
        glint
        onInteract={() => {
          giveItem('clue_fridge_drawing');
          inspectItem('clue_fridge_drawing');
        }}
      />
      <FuseBox pos={[-7.92, 1.5, -6.9]} rot={Math.PI / 2} on={power} />
      <Interactable
        id="fusebox"
        at={[-7.85, 1.5, -6.9]}
        prompt={() => (power ? null : 'Flip the main breaker')}
        glint={!power}
        onInteract={restorePower}
      />
      <Trigger
        x0={-8}
        z0={-8}
        x1={1}
        z1={-3}
        onEnter={async () => {
          if (power) return;
          await wait(1.2);
          sting('soft');
          showFigure([-9.2, 0, -5.5], { duration: 1.6, vanishOnLook: 0.6 });
          await say('c1_kitchen_figure');
        }}
      />

      {/* ── hallway ── */}
      <Table pos={[3.1, 0, -3]} w={0.45} d={0.9} h={0.8} />
      <AnsweringMachine pos={[3.1, 0.8, -3]} rot={-Math.PI / 2} blinking={power && !voicemailHeard} />
      <Interactable
        id="machine"
        at={[3.1, 0.88, -3]}
        prompt={() => (!power ? null : voicemailHeard ? 'Play the message again' : 'Play the message')}
        glint={power && !voicemailHeard}
        onInteract={playVoicemail}
      />
      <Frame pos={[1.1, 1.6, -1]} rot={Math.PI / 2} tint="#6a5a48" />
      <Frame pos={[1.1, 1.65, 1.6]} rot={Math.PI / 2} tint="#4a5a66" w={0.3} h={0.4} />
      <Crates pos={[2.3, 0, -7.4]} n={2} />

      {/* ── closet ── */}
      <B p={[4.5, 1.6, -7.92]} s={[0.4, 0.04, 0.08]} m="dark_wood" />
      {!keyTaken && <KeyProp pos={[4.5, 1.5, -7.85]} />}
      <Interactable id="key" at={[4.5, 1.5, -7.8]} prompt="Take the key" enabled={!keyTaken && closetOpen} glint onInteract={takeKey} />

      {/* ── stairs / upstairs door ── */}
      <Interactable
        id="go_upstairs"
        at={[6.8, 4.0, -5.9]}
        reach={2.2}
        prompt={() => (hasItem('key_noah') ? "Unlock the door to the second floor" : 'Locked door')}
        onInteract={goUpstairs}
      />

      {/* ── story triggers ── */}
      <Trigger
        x0={-14}
        z0={6}
        x1={14}
        z1={10.5}
        onEnter={async () => {
          setLight('upstairs', true);
          setUpstairsLit(true);
          play('click', { pos: [-4, 4, 3], vol: 0.4 });
          await say('c1_upstairs_light');
          await wait(1.4);
          showFigure([-4, 2.95, 3.4], { duration: 2.6, vanishOnLook: 1.4 });
          sting('soft');
          await say('c1_window_shadow');
        }}
      />
      <Trigger x0={1.1} z0={-8} x1={7.9} z1={3.7} onEnter={goInside} />
      <Trigger
        x0={3.6}
        z0={-6}
        x1={8}
        z1={4}
        onEnter={() => {
          if (!power) say([{ who: 'Elias', text: 'The stairs. Our rooms are up there.', voice: 'elias' }]);
        }}
      />
    </>
  );
}
