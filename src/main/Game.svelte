<script>
	import { onMount } from "svelte";
	import { timer, job_m, mouse, player, contr, canvas, drop_speeds } from "../game.js";
	import { cash } from "../stores.js";
	import draw from "../utils/draw.js";
	import { entity_m, Entity, Components as comps, closest_trig } from '../utils/entity.js';
	import entities from "../entities.json";
	import { fnum } from "../utils/utils.js";
	
	const plant_png = new Image(40, 60);
	plant_png.src = "../assets/plant.png";
	let got_plant = false;

	const hampter_png = new Image(40, 60);
	hampter_png.src = "../assets/hampter.png";
	let got_hampter = false;

	//#region | Canvas
	/** <main> holding all html of the game */
	let main;
	
	/** @type {CanvasRenderingContext2D}*/
	let ctx;
	/** Causes main_loop to not run if true */
	let pause = false;
	/** If paused is true: then it runs main_loop once and goes back to being paused */
	let step = true;
	/** Background color of the canvas */
	const background_color = "#3d6b32";
	/** Width and height of canvas */
	let w, h; 
	//#endregion
	
	//#region | Setup Entities
	for (let i = 0; i < entities.length; i++) {
		const obj = entities[i];
		let components = [];
		let tag_id = {};
		let enabled = true;
		for (const k in obj) {
			if (!Object.hasOwnProperty.call(obj, k)) continue;
			const v = obj[k];
			if (k == "tag") tag_id.tag = v;
			if (k == "id") tag_id.id = v;
			if (k == "enabled") enabled = v;
			if (comps[k] == undefined || !Array.isArray(v)) continue;
			components.push( new comps[k](...v) );
		}
		const new_ent = new Entity(tag_id, enabled);
		new_ent.components = components;
	}

	entity_m.gid("spawn_drop_1").Graphic.draw = ()=> draw.rect(0,0, 30,30, "red", false);
	entity_m.gid("spawn_drop_2").Graphic.draw = ()=> draw.rect(0,0, 30,30, "red", false);
	// entity_m.gid("test_trigger").Trigger.activate = ()=> entity_m.gid("conveyor_2").enabled = !entity_m.gid("conveyor_2").enabled;
	entity_m.gid("buy_drop_1").Trigger.activate = ()=>{
		if ($cash < 50) return; $cash -= 50;
		const group1 = entity_m.tag("drop_group_1");
		for (let i = 0; i < group1.length; i++) {
			const drop = group1[i];
			if (!drop.enabled) {
				drop.enabled = true;
				break;
			}
		}
		if (group1.at(-1).enabled) {
			entity_m.gid("buy_drop_1").destroy = true;
			entity_m.gid("upgr_drop_1").enabled = true;
		}
	}
	entity_m.gid("upgr_drop_1").Trigger.activate = ()=>{
		if ($cash < 50) return; $cash -= 50;
		if (drop_speeds.drop_group_1 <= 5) {
			entity_m.gid("upgr_drop_1").Trigger.hint = `Upgrade dropper speed (Max!)\n[${drop_speeds.drop_group_1}]`;
			return;
		}
		entity_m.gid("upgr_drop_1").Trigger.hint = `Upgrade dropper speed ($50)\n[${drop_speeds.drop_group_1} → ${drop_speeds.drop_group_1-5}]`;
		drop_speeds.drop_group_1 -= 5;
	}
	entity_m.gid("spawn_drop_1").Trigger.activate = ()=>{
		const group1 = entity_m.match(ent => ent.Dropper != undefined && ent.enabled == true && ent.tag == "drop_group_1");
		group1.forEach(ent => ent.Dropper.ticks = 0);
	}
	entity_m.gid("buy_mult_1").Trigger.activate = ()=>{
		if ($cash < 150) return; $cash -= 150;
		const group1 = entity_m.tag("mult_group_1");
		for (let i = 0; i < group1.length; i++) {
			const mult = group1[i];
			if (mult.enabled == false) {
				mult.enabled = true;
				break;
			}
		}
		if (group1.at(-1).enabled == true) {
			entity_m.gid("buy_mult_1").destroy = true;
		}
	}	

	entity_m.gid("unlock_conveyor").Trigger.activate = ()=>{
		if ($cash < 100) return; $cash -= 100;
		entity_m.gid("conveyor_2").enabled = true;
		entity_m.gid("unlock_conveyor").destroy = true;
		entity_m.gid("buy_drop_2").enabled = true;
		entity_m.gid("buy_mult_2").enabled = true;
	}

	entity_m.gid("buy_drop_2").Trigger.activate = ()=>{
		if ($cash < 250) return; $cash -= 250;
		entity_m.gid("spawn_drop_2").enabled = true;
		const group2 = entity_m.tag("drop_group_2");
		for (let i = 0; i < group2.length; i++) {
			const drop = group2[i];
			if (!drop.enabled) {
				drop.enabled = true;
				break;
			}
		}
		if (group2.at(-1).enabled) {
			entity_m.gid("buy_drop_2").destroy = true;
			entity_m.gid("upgr_drop_2").enabled = true;
			entity_m.gid("egg").enabled = true;
		}
	}
	entity_m.gid("upgr_drop_2").Trigger.activate = ()=>{
		if ($cash < 100) return; $cash -= 100;
		if (drop_speeds.drop_group_2 <= 5) {
			entity_m.gid("upgr_drop_2").Trigger.hint = `Upgrade dropper speed (Max!)\n[${drop_speeds.drop_group_2}]`;
			return;
		}
		entity_m.gid("upgr_drop_2").Trigger.hint = `Upgrade dropper speed ($50)\n[${drop_speeds.drop_group_2} → ${drop_speeds.drop_group_2-5}]`;
		drop_speeds.drop_group_2 -= 5;
	}
	entity_m.gid("buy_mult_2").Trigger.activate = ()=>{
		if ($cash < 200) return; $cash -= 200;
		const group2 = entity_m.tag("mult_group_2");
		for (let i = 0; i < group2.length; i++) {
			const mult = group2[i];
			if (mult.enabled == false) {
				mult.enabled = true;
				break;
			}
		}
		if (group2.at(-1).enabled == true) {
			entity_m.gid("buy_mult_2").destroy = true;
		}
	}
	entity_m.gid("spawn_drop_2").Trigger.activate = ()=>{
		const group2 = entity_m.match(ent => ent.Dropper != undefined && ent.enabled == true && ent.tag == "drop_group_2");
		group2.forEach(ent => ent.Dropper.ticks = 0);
	}

	entity_m.gid("buy_plant").Trigger.activate = ()=>{
		if ($cash < 10000) return; $cash -= 10000;
		entity_m.gid("buy_plant").destroy  =  entity_m.gid("plant").enabled  =  got_plant = true;
	}

	entity_m.gid("egg").Trigger.activate = ()=>{
		entity_m.gid("egg").destroy = true;
		entity_m.gid("egg_col").enabled = true;
		got_hampter = true;
	}

	entity_m.pool_all_with_comp("Upgrader");

	//#endregion

	//#region | Main Stuff
	const main_loop = (v)=>{
		if (step === false && pause === true) return;
		if (step === true) step = false;
		ctx.fillStyle = background_color;
		ctx.fillRect(0, 0, w, h);

		// triggers.update();
		player.update();
		entity_m.update();
		player.draw();

		got_plant && draw.image(plant_png, 50,420, 80,120);
		got_hampter && draw.image(hampter_png, 0,500, 100,100);

		set_trig_hint(closest_trig(player));
	}
	onMount(()=>{
		ctx = $canvas.getContext("2d");
		draw.set_ctx(ctx);
		timer.subscribe((v)=>{ 
			try {
				main_loop(v);
			} catch (err) {
				console.log(err);
				pause = true;
			}
		});
		
		$canvas.width = main.clientWidth;
		$canvas.height = main.clientHeight;
		[w, h] = [$canvas.width, $canvas.height];

		$canvas.onmouseleave = ()=>{
			mouse.hover = false;
		}
		$canvas.onmousemove = (e)=>{
			[ mouse.x, mouse.y ] = [ e.layerX, e.layerY ];
		}
		$canvas.onmousedown = (e)=>{
			const [ x, y ] = [ e.layerX, e.layerY ];
			mouse.down = true;
		}
		$canvas.onmouseup = (e)=>{
			mouse.down = false;
		}
		player.x = 500; player.y = 300
	});
	//#endregion

	//#region | Trigger hint
	/** @type HTMLElement */
	let trig_hint;
	const set_trig_hint = (ent)=>{
		const st = trig_hint.style;
		if (ent == null) {
			st.transform = "translate(-50%, calc(-100% - 5px))";
			return;
		} 
		st.transform = "translate(-50%, 5%)";
		/** @type String */
		const hint = ent.Trigger.hint;
		if (hint.slice(0, 6) == "@html ") trig_hint.innerHTML = hint.slice(6);
		else trig_hint.innerText = hint;
	}
	//#endregion

	//#region | Key Events
	const press_e = ()=>{
		closest_trig(player)?.Trigger?.activate();
	}
	document.onkeydown = ({ key })=>{
		if (key == "a" && !contr.a) contr.a = true;
		else if (key == "d" && !contr.d) contr.d = true;
		else if (key == "w" && !contr.w) contr.w = true;
		else if (key == "s" && !contr.s) contr.s = true;
		else if (key == "e" && !contr.e) (contr.e = true, press_e())
		// else if (key == "e") press_e();
		// else if (key == "v") entity_m.all_comps("Dropper").forEach(d => d.ticks=0);
	}
	document.onkeyup = ({ key })=>{
		if (key == "a") contr.a = false;
		else if (key == "d") contr.d = false;
		else if (key == "w") contr.w = false;
		else if (key == "s") contr.s = false;
		else if (key == "e") contr.e = false;
		// else if (key == "c") $cash += 100;
		// else if (key == "z") step = true;
		// else if (key == "x") pause = !pause;
		// else if (key == "l") console.log(player);
	}
	window.onblur = ()=> {
		contr.a = contr.d = contr.w = contr.s = false;
	}
	//#endregion
	
</script>

<main bind:this={main}>
	<!-- svelte-ignore component-name-lowercase -->
	<canvas bind:this={$canvas}></canvas>
	<h3 id="cash">Cash: {fnum($cash)}</h3>
	<div id="trigger-hint" bind:this={trig_hint}></div>
</main>

<style>
	main {
		position: relative;
		overflow: hidden;
	}
	canvas {
		position: absolute;
		left: 0; top: 0;
		width: 100%;
		height: 100%;
	}
	#trigger-hint {
		position: absolute;
		padding: 0.5rem 0.7rem;
		background-color: white;
		border-radius: 3px;
		top: 5px;
		left: 50%;
		transform: translate(-50%, calc(-100% - 5px));
		border: 1px solid #333;
		transition-duration: 0.3s;
		text-align: center;
	}
	#cash {
		position: absolute;
		top: 0;
		left: 0;
		padding: 0.5rem 0.7rem;
		color: white;
	}
</style>