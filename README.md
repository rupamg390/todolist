# TaskFlow — Daily Task Manager

A clean, modern task management web app built with vanilla HTML, CSS, and JavaScript. No frameworks, no dependencies — just fast, lightweight, and fully functional.

---

## Features

- **Add, edit, and delete tasks** with a smooth modal interface
- **Mark tasks complete** with animated checkbox
- **Priority levels** — Low, Medium, High (color-coded)
- **Filter tasks** — All, Pending, Completed
- **Search** tasks by keyword (debounced input)
- **Animated progress arc** showing your completion percentage
- **Stats dashboard** — total, done, and pending counts
- **LocalStorage persistence** — tasks survive page refresh
- **Delete confirmation** dialog to prevent accidents
- **Responsive design** — sidebar collapses on mobile with a hamburger menu
- **Keyboard accessible** — Escape closes modals, Enter submits

---

## Technologies

| Layer      | Tech                         |
|------------|------------------------------|
| Structure  | HTML5 (semantic, ARIA labels)|
| Styling    | CSS3 (custom properties, Flexbox, Grid, animations) |
| Logic      | JavaScript ES6+ (no frameworks) |
| Fonts      | Google Fonts — Space Grotesk + Inter |
| Storage    | Web LocalStorage API         |

---

## Project Structure

```
taskflow/
├── index.html    # App shell, modals, sidebar, task list container
├── style.css     # Design tokens, layout, components, animations
├── script.js     # State management, CRUD, rendering, event wiring
└── README.md     # This file
```

---

## Setup & Usage

### Run locally
1. Download or clone this repository
2. Open `index.html` in any modern browser
3. No build step or server required

### Deploy to GitHub Pages
1. Push the folder contents to a GitHub repository
2. Go to **Settings → Pages**
3. Set source to `main` branch, `/ (root)`
4. Your app will be live at `https://<username>.github.io/<repo>/`

### Deploy to Netlify
1. Drag and drop the `taskflow/` folder onto [netlify.com/drop](https://app.netlify.com/drop)
2. Netlify instantly publishes and gives you a live URL

---

## Browser Support

Works in all modern browsers: Chrome, Firefox, Safari, Edge.

---

## License

MIT — free to use, modify, and distribute.
