"""Task 9: where does the simulated engine stop agreeing with the analysis?

revbench's own check.py, with one change: the baseline is called with the
engine that was rendered, so the search range is the app's scaled one rather
than the fixed four-stroke range. That is what rpm-boss itself does.
"""
import importlib.util, os, subprocess, sys, tempfile
import numpy as np
from scipy.io import wavfile
from scipy.signal import resample_poly

RB = os.path.expanduser("~/git/rpm-boss")
RENDER = os.path.expanduser("~/git/revbench/scripts/render.mjs")
TOLERANCE, SECONDS = 0.03, 4
SPEEDS = [600, 800, 1100, 1600, 2500, 4000, 6000, 8000, 9500, 10500, 11000, 11500, 11700, 12000]

spec = importlib.util.spec_from_file_location("b", os.path.join(RB, "scripts", "reference", "analyse.py"))
b = importlib.util.module_from_spec(spec); spec.loader.exec_module(b)
b.MIN_RATE = 5.0

worst = {}
with tempfile.TemporaryDirectory() as tmp:
    for revs in (2, 1):
        print(f"\n{'four-stroke' if revs == 2 else 'two-stroke'}  (search range scaled to this engine)")
        print(f"{'set':>6} {'c/s set':>8} {'c/s read':>9} {'error':>7} {'conf':>5}")
        for rpm in SPEEDS:
            wav = os.path.join(tmp, f"{revs}-{rpm}.wav")
            subprocess.run(["node", RENDER, str(rpm), str(SECONDS), wav, str(revs)], check=True,
                           stdout=subprocess.DEVNULL)
            rate, data = wavfile.read(wav)
            x = resample_poly(data.astype(np.float64) / 32768, b.SR, rate)
            got = b.analyse(x, revs_per_pulse=revs)
            want = rpm / (60 * revs)
            err = (got["pulsesPerS"] - want) / want if got else float("nan")
            ok = got is not None and abs(err) <= TOLERANCE
            if ok:
                worst[revs] = rpm
            print(f"{rpm:6d} {want:8.2f} {got['pulsesPerS'] if got else float('nan'):9.2f} "
                  f"{err*100:+6.1f}% {got['confidence'] if got else 0:5.2f} {'' if ok else '  FAIL'}")
print("\nhighest clean speed:", worst)
