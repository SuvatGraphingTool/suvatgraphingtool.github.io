# journey-stages: critic round 1 (29 Oct 2026), FAIL, to fix on resume

All suites pass, and all four papers are right (J12 Q4: 30 and 155 s; J11 Q4: 310 m, V = 4, 0.05; J15 Q7: V = 30, 70 rejected; J13 Q5(b): T = 75, with lights).

To fix, most important first:
1. "Not enough" on solvable papers: V is picked first, and then a relation between two unknown times can't be used. For example, u = 0, up / hold t2 = 50 / down to 0, t3 = 4·t1, T = 100, D = 1500 should give t1 = 10, V = 20. The same goes for rate relations, e.g. 2 stages with a2 = 2a1, T = 30, D = 300 (should give V = 20). The likely fix is to allow two unknowns, or to try a time as the unknown when V fails.
2. The speed-axis labels (V = 30, v m s⁻¹) hide under the left HUD boxes, since the label at gx0 − 10 sits under a HUD that is about 210 px wide or wider. Move the labels inside the axis or shift gx0.
3. Overlaps:
   - The a-label and arrow run onto the lights pole at A and B (car, 1024 and 1366).
   - The runner's a-arrow crosses the A sign.
   - Equal-time labels sit under and over the traveller and on the track lines.
   - Travellers at the end are drawn over B's post or lights.
4. The train has no real station: the 52×10 grey strip can't be seen. Draw a proper platform or station.
5. The at.v wording:
   - It counts a hold stage that starts at that speed as a separate time ("3 times").
   - With at.v = 0 at rest at A it says "speeding up".
6. The quadratic working:
   - It shows "−0 ± √(0² …)" when b = 0; it should take the square root instead.
   - It should clear decimal leading coefficients (0.5V² → ×2) and factorise.
   - Needless brackets: "(0.25V²)".
   - It writes 0.5V where ½V is wanted.
7. A blank start speed u is called V; it should be called u.
8. Rule 1: the note "½(u + v)t" in journeyWorking is plain text; send it through M``.
9. The rate shows with 2, 3 and 4 decimals across the HUD, canvas and working; use one rule.
10. Narrow stage brackets are labelled with bare digits ("1"), which read as times. Equal-time labels show "2.0 s".
11. The values screen:
   - The label "(m s⁻¹)" wraps, splitting the unit.
   - The kind chips stack in changing stages but sit in a row in steady ones.
12. Contradictions while the journey is underdetermined only say "Not enough" (e.g. v1 = 5, t1 = 2, a1 = 3).

Out of scope (shared): phone header overflow; the pace dialog says 15× but "20 times"; the v–t side graph's area label sits over the curve.

## Round 2 (Sonnet), PASS, with polish deferred to the audit
1. Runner: the "V = 4" label crowds the "5" tick on the steep stage-1 ramp.
2. Lights car: the a-arrow ends on the A lights pole, and its label is dropped (the value is only in the HUD).
3. The Time and Time-lapse HUD boxes sit over the top right of the v–t graph (shared HUD).
4. Rates show to 4 significant figures (0.7333) where the exact value is 11/15; say they are rounded, or give the fraction.
5. A narrow stage's bracket is a bare "t₁"; the runner's s₁ is a bare subscript.
6. A relation row substitutes "0.5 × t₁" next to the result "½t₁".
