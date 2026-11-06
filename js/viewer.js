// The 3D periodic-table style viewer, adapted from three.js css3d_periodictable.
import * as THREE from 'three';
import TWEEN from 'three/addons/libs/tween.module.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';
import { LAYOUTS } from './layouts.js';

function buildTile(person) {
  const tile = document.createElement('div');
  tile.className = `tile tier-${person.tier}`;
  tile.title = person.netWorthLabel ? `${person.name} | ${person.netWorthLabel}` : person.name;

  const country = document.createElement('div');
  country.className = 'tile-country';
  country.textContent = person.country;
  tile.appendChild(country);

  const age = document.createElement('div');
  age.className = 'tile-age';
  age.textContent = person.age;
  tile.appendChild(age);

  const photoWrap = document.createElement('div');
  photoWrap.className = 'tile-photo';
  const initials = () => {
    photoWrap.replaceChildren();
    photoWrap.textContent = person.name
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0] ?? '')
      .join('')
      .toUpperCase();
  };
  if (person.photo) {
    const img = document.createElement('img');
    img.alt = '';
    img.loading = 'lazy';
    img.referrerPolicy = 'no-referrer';
    img.addEventListener('error', initials);
    img.src = person.photo;
    photoWrap.appendChild(img);
  } else {
    initials();
  }
  tile.appendChild(photoWrap);

  const name = document.createElement('div');
  name.className = 'tile-name';
  name.textContent = person.name;
  tile.appendChild(name);

  const interest = document.createElement('div');
  interest.className = 'tile-interest';
  interest.textContent = person.interest;
  tile.appendChild(interest);

  return tile;
}

function toObject3D({ position, look, up }) {
  const o = new THREE.Object3D();
  o.position.set(...position);
  if (up) o.up.set(...up);
  if (look) o.lookAt(new THREE.Vector3(...look));
  return o;
}

/**
 * Mounts the viewer into `container`. Returns { show(layoutName), destroy() }.
 */
export function createViewer(container, people) {
  const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 1, 10000);
  camera.position.z = 3000;
  const scene = new THREE.Scene();

  const renderer = new CSS3DRenderer();
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  const objects = people.map((person) => {
    const obj = new CSS3DObject(buildTile(person));
    obj.position.set(Math.random() * 4000 - 2000, Math.random() * 4000 - 2000, Math.random() * 4000 - 2000);
    scene.add(obj);
    return obj;
  });

  const targets = Object.fromEntries(
    Object.entries(LAYOUTS).map(([name, fn]) => [name, fn(people.length).map(toObject3D)]),
  );

  const controls = new TrackballControls(camera, renderer.domElement);
  controls.minDistance = 500;
  controls.maxDistance = 6000;

  function show(layoutName, duration = 1500) {
    const list = targets[layoutName];
    if (!list) return;
    TWEEN.removeAll();
    objects.forEach((obj, i) => {
      const t = list[i];
      new TWEEN.Tween(obj.position)
        .to({ x: t.position.x, y: t.position.y, z: t.position.z }, Math.random() * duration + duration)
        .easing(TWEEN.Easing.Exponential.InOut)
        .start();
      new TWEEN.Tween(obj.rotation)
        .to({ x: t.rotation.x, y: t.rotation.y, z: t.rotation.z }, Math.random() * duration + duration)
        .easing(TWEEN.Easing.Exponential.InOut)
        .start();
    });
  }

  let frame = 0;
  const animate = () => {
    frame = requestAnimationFrame(animate);
    TWEEN.update();
    controls.update();
    renderer.render(scene, camera);
  };
  animate();

  const onResize = () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  };
  window.addEventListener('resize', onResize);

  return {
    show,
    destroy() {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
      TWEEN.removeAll();
      controls.dispose();
      renderer.domElement.remove();
    },
  };
}
