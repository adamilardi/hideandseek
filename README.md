# Hide & Seek: Annoying Kids Edition

A tiny browser prototype for the hide-and-seek game concept:

- 60s hide phase where all rooms are visible.
- 120s seek phase with fog-of-war.
- Kids: Robo, Jobo, Mikey, Eric, Avery, Matthew, Franklin.
- Run mechanic with stamina and tired slowdown.
- Difficulty levels (Easy/Normal/Hard) that alter fog vision, doors, and secret paths.
- Funny found sound and 5-second alarm.
- Random seeker rotation after each round.
- If all kids are found, seeker unlocks a sonar helper tool for the next round.
- Giggle hints periodically reveal an approximate map area.
- Cartoon top-down visuals with slowing obstacles (sand/spilled food).

## Run

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Controls

- **Move:** WASD or Arrow keys
- **Run:** Hold Shift or click Run toggle
- **Open door:** E
- **Inspect:** Space
- **Use unlocked tool:** R
