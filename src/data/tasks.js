// FILE: src/data/tasks.js

/** @typedef {{ id: string, title: string, pts: number, helper: string }} Task */

/** @type {Record<string, Task[]>} */
export const TASKS = {
  josie: [
    { id: 'toys',    title: 'Tummy time / toy play', pts: 15, helper: 'Mom or Dad checks after play time' },
    { id: 'feeding', title: 'Feeding time',           pts: 15, helper: 'Checked after bottle or feeding' },
    { id: 'diaper',  title: 'Diaper time',            pts: 10, helper: 'Checked after diaper change' },
    { id: 'nap',     title: 'Nap time',               pts: 20, helper: 'Checked after a good nap' },
    { id: 'bath',    title: 'Bath time',              pts: 15, helper: 'Checked after bath routine' },
    { id: 'bed',     title: 'Bedtime routine',        pts: 25, helper: 'Checked when settled for bed' },
  ],
  lincoln: [
    { id: 'toys',    title: 'Pick up toys',       pts: 20, helper: 'Tap when toys are cleaned up' },
    { id: 'clothes', title: 'Put clothes away',   pts: 15, helper: 'Tap when clothes are in place' },
    { id: 'dishes',  title: 'Help with dishes',   pts: 15, helper: 'Tap after helping Mom or Dad' },
    { id: 'kind',    title: 'Kind helper moment', pts: 20, helper: 'Tap after being a great helper' },
    { id: 'room',    title: 'Clean bedroom zone', pts: 30, helper: 'Tap when the bedroom zone is clean' },
  ],
  sienna: [
    { id: 'room',    title: 'Clean room reset',           pts: 20, helper: 'Tap when your room is reset' },
    { id: 'laundry', title: 'Laundry moved or folded',    pts: 20, helper: 'Tap after laundry is handled' },
    { id: 'dishes',  title: 'Dishes / kitchen help',      pts: 15, helper: 'Tap after helping in the kitchen' },
    { id: 'trash',   title: 'Trash or recycling',         pts: 15, helper: 'Tap after taking it out' },
    { id: 'help',    title: 'Help with Lincoln or Josie', pts: 30, helper: 'Tap after helping with the little ones' },
  ],
};
