using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Windows.Forms;

// Lanceur Stage3D : extrait l'application embarquée et l'ouvre dans une fenêtre Edge/Chrome dédiée.
static class Launcher
{
    static string Find(params string[] paths)
    {
        foreach (var p in paths) if (File.Exists(p)) return p;
        return null;
    }

    [STAThread]
    static int Main()
    {
        try
        {
            string root = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Stage3D");
            string app = Path.Combine(root, "app");
            Directory.CreateDirectory(app);
            var asm = Assembly.GetExecutingAssembly();
            foreach (var name in new[] { "index.html", "style.css", "app.js" })
                using (var s = asm.GetManifestResourceStream(name))
                using (var f = File.Create(Path.Combine(app, name)))
                    s.CopyTo(f);

            string pf = Environment.GetEnvironmentVariable("ProgramFiles");
            string pf86 = Environment.GetEnvironmentVariable("ProgramFiles(x86)");
            string lad = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            string browser = Find(
                Path.Combine(pf86 ?? "", @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(pf ?? "", @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(pf ?? "", @"Google\Chrome\Application\chrome.exe"),
                Path.Combine(pf86 ?? "", @"Google\Chrome\Application\chrome.exe"),
                Path.Combine(lad, @"Google\Chrome\Application\chrome.exe"));
            if (browser == null)
            {
                MessageBox.Show("Stage3D a besoin de Microsoft Edge ou Google Chrome, introuvables sur ce PC.\n\nVous pouvez aussi ouvrir le fichier index.html dans n'importe quel navigateur.", "Stage3D", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return 1;
            }
            string url = new Uri(Path.Combine(app, "index.html")).AbsoluteUri;
            string profile = Path.Combine(root, "profil");
            var psi = new ProcessStartInfo(browser,
                "--app=\"" + url + "\" --user-data-dir=\"" + profile + "\" --window-size=1440,880 --no-first-run --no-default-browser-check --disable-features=Translate")
            { UseShellExecute = false };
            Process.Start(psi);
            return 0;
        }
        catch (Exception e)
        {
            MessageBox.Show("Impossible de lancer Stage3D :\n" + e.Message, "Stage3D", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 2;
        }
    }
}
