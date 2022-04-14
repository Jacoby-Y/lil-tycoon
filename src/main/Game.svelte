<script>
	import { onMount } from "svelte";
	import { timer, job_m, mouse, player, contr, canvas } from "../game.js";
	import { cash } from "../stores.js";
	import draw from "../utils/draw.js";
	import { entity_m, Entity, Components as comps } from '../utils/entity.js';
	import entities from "../entities.json";

	//#region | Canvas
	/** <main> holding all html of the game */
	let main;
	
	/** @type {CanvasRenderingContext2D}*/
	let ctx;
	/** Causes main_loop to not run if true */
	let pause = false;
	/** If paused is true: then it runs main_loop once and goes back to being paused */
	let step = false;
	/** Background color of the canvas */
	const background_color = "#3d6b32";
	/** Width and height of canvas */
	let w, h; 
	//#endregion
	
	//#region | Main Stuff
	const main_loop = (v)=>{
		if (!step && pause) return;
		if (step) step = false;
		ctx.fillStyle = background_color;
		ctx.fillRect(0, 0, w, h);

		// triggers.update();
		try {
			player.update();
			entity_m.update();
			player.draw();
		} catch (error) {
			console.log(error);
			pause = true;
		}
	}
	onMount(()=>{
		ctx = $canvas.getContext("2d");
		draw.set_ctx(ctx);
		timer.subscribe((v)=>{ main_loop(v); main_loop(v); });
		
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
	});
	
	//#endregion

	// new Entity().components = [
	// 	new comps.Position(10, 10),
	// 	new comps.Graphic(()=> draw.circle(0,0, 5, "red")),
	// ];
	
	for (let i = 0; i < entities.length; i++) {
		const obj = entities[i];
		// const ent = new Entity({ tag: obj.tag, id: obj.id });
		let components = [];
		let tag_id = {};
		for (const k in obj) {
			if (!Object.hasOwnProperty.call(obj, k)) continue;
			const v = obj[k];
			if (k == "tag") tag_id.tag = v;
			if (k == "id") tag_id.id = v;
			if (comps[k] == undefined || !Array.isArray(v)) continue;
			components.push( new comps[k](...v) );
		}
		const new_ent = new Entity(tag_id);
		new_ent.components = components;
	}

	//#region | Key Events
	document.onkeydown = ({ key })=>{
		if (key == "a" && !contr.a) contr.a = true;
		if (key == "d" && !contr.d) contr.d = true;
		if (key == "w" && !contr.w) contr.w = true;
		if (key == "s" && !contr.s) contr.s = true;
		if (key == "e" && !contr.e) (contr.e = true, triggers.press_e())
	}
	document.onkeyup = ({ key })=>{
		if (key == "a") contr.a = false;
		if (key == "d") contr.d = false;
		if (key == "w") contr.w = false;
		if (key == "s") contr.s = false;
		if (key == "e") contr.e = false;
	}
	window.onblur = ()=> {
		contr.a = contr.d = contr.w = contr.s = false;
	}
	//#endregion
	
</script>

<main bind:this={main}>
	<!-- svelte-ignore component-name-lowercase -->
	<canvas bind:this={$canvas}></canvas>
	<h3 id="cash">Cash: {$cash}</h3>
	<!-- <div id="trigger-info" style="display: {on_trigger ? "block" : "none"};" bind:this={trigger_info}></div> -->
</main>

<style>
	main {
		position: relative;
	}
	canvas {
		position: absolute;
		left: 0; top: 0;
		width: 100%;
		height: 100%;
	}
	#trigger-info {
		position: absolute;
		padding: 0.5rem 0.7rem;
		background-color: white;
		border-radius: 3px;
		transform: translate(-50%, -0%);
		display: none;
		border: 1px solid #333;
	}
	#cash {
		position: absolute;
		top: 0;
		left: 0;
		padding: 0.5rem 0.7rem;
		color: white;
	}
</style>