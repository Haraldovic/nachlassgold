"""Stage only public site assets from the site repository root."""
from pathlib import Path
import shutil
import sys

extensions = {
    ".ics", ".html", ".css", ".js", ".json", ".svg", ".ico", ".png", ".jpg", ".jpeg", ".avif",
    ".webp", ".gif", ".woff", ".woff2", ".ttf", ".pdf", ".xml", ".webmanifest", ".mp4",
}
root = Path.cwd()
dest = Path(sys.argv[1]).resolve()
if dest.exists() or not (root / "index.html").is_file():
    sys.exit("Ein leeres Ziel und eine index.html im Repo-Stamm sind erforderlich.")
public_files = [
    path for path in root.rglob("*")
    if path.is_file() and not path.is_symlink()
    and not any(part.startswith(".") for part in path.relative_to(root).parts)
    and (path.suffix.lower() in extensions or path.name in ("CNAME", "robots.txt", "Cormorant-OFL.txt", "DMSans-OFL.txt"))
]
for path in public_files:
    target = dest / path.relative_to(root)
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(path, target)
(dest / ".nojekyll").touch()
