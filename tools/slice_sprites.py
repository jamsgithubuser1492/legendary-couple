"""Cuts individual transparent PNG sprites out of the art sheets in art/source/.

Run:  python3 tools/slice_sprites.py
Writes public/assets/sprites/*.png and src/game/spriteList.ts.
Each entry is (key, sheet, (x0, y0, x1, y1), optional erase rects that paint over stray label text).
"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'art', 'source')
OUT = os.path.join(ROOT, 'public', 'assets', 'sprites')
SHEETS = {
    's1': 'sheet1_overview.webp', 's2': 'sheet2_modular_seasonal.webp', 's6': 'sheet6_cafe_day.jpg',
    's7': 'sheet7_world_characters.jpg', 's8': 'sheet8_cafe_sunset.jpg',
    's12': 'sheet12_downtown.jpg', 's13': 'sheet13_boardwalk.jpg', 's14': 'sheet14_regions.jpg',
    's27': 'sheet27_mountain_trails.jpg', 's28': 'sheet28_coastal_motion.jpg', 's29': 'sheet29_trees_beach.webp', 's30': 'sheet30_houses_towers.webp',
    's9': 'sheet9_starter_walldecor.jpg', 's10': 'sheet10_rv_interior.jpg', 's11': 'sheet11_camp_characters.jpg',
}

SPRITES = [
    # --- sheet 2: modular home, early furniture, seasonal ---
    ('floor_wood', 's2', (610, 175, 790, 292)),
    ('wall_single', 's2', (800, 108, 905, 282)),
    ('wall_corner', 's2', (943, 108, 1106, 282)),
    ('wall_window', 's2', (1148, 108, 1272, 290)),
    ('wall_door', 's2', (1308, 104, 1422, 292)),
    ('bed_gingham', 's2', (612, 450, 842, 645)),
    ('nightstand', 's2', (898, 458, 1036, 632)),
    ('chair_sage', 's2', (1100, 458, 1230, 632)),
    ('mug', 's2', (1283, 512, 1400, 622)),
    ('xmas_tree', 's2', (468, 705, 622, 982)),
    ('blanket_red', 's2', (632, 795, 800, 958)),
    ('tree_spring', 's2', (835, 828, 945, 930)),
    ('tree_summer', 's2', (993, 828, 1095, 930)),
    ('tree_autumn', 's2', (1150, 828, 1260, 930)),
    ('tree_winter', 's2', (1295, 828, 1418, 930)),
    ('blanket_spring', 's2', (835, 922, 945, 1008)),
    ('blanket_summer', 's2', (993, 922, 1100, 1008)),
    ('blanket_autumn', 's2', (1150, 922, 1265, 1008)),
    ('blanket_winter', 's2', (1295, 922, 1418, 1008)),
    # --- sheet 8: sunset cafe set ---
    ('cafe_exterior', 's8', (60, 380, 415, 668), [(60, 383, 182, 410)]),
    ('wooden_chair_a', 's8', (452, 418, 525, 520)),
    ('wooden_chair_b', 's8', (527, 418, 597, 520)),
    ('cushion_set', 's8', (610, 418, 790, 515)),
    ('round_table_set', 's8', (448, 552, 608, 668)),
    ('square_table_set', 's8', (612, 552, 790, 668)),
    ('bookshelf_cafe', 's8', (805, 410, 892, 500)),
    ('counter_pastry', 's8', (805, 512, 1020, 658)),
    ('food_matcha', 's8', (452, 752, 518, 802)),
    ('food_tray', 's8', (528, 750, 606, 802)),
    ('food_cake_a', 's8', (628, 738, 702, 805)),
    ('food_cake_b', 's8', (712, 735, 790, 805)),
    ('food_slice', 's8', (798, 735, 872, 805)),
    ('food_croissant', 's8', (448, 842, 520, 902)),
    ('food_display', 's8', (532, 842, 622, 905)),
    ('food_macarons', 's8', (624, 848, 702, 902)),
    ('food_loaf', 's8', (710, 842, 792, 902)),
    ('food_bread', 's8', (798, 842, 872, 905)),
    ('plant_a', 's8', (898, 750, 955, 820)),
    ('plant_b', 's8', (955, 752, 1016, 818)),
    ('plant_snake', 's8', (903, 828, 958, 905)),
    ('lamp', 's8', (1028, 752, 1072, 818)),
    ('menu_sign', 's8', (962, 828, 1016, 905)),
    ('suitcase', 's8', (1018, 846, 1082, 906)),
    # --- sheet 6: daylight cafe ---
    ('couch_sectional', 's6', (820, 68, 1058, 228)),
    ('pastry_case', 's6', (462, 742, 684, 950)),
    ('bread_shelf', 's6', (702, 758, 880, 945)),
    ('menu_stand_a', 's6', (922, 835, 990, 935)),
    ('menu_stand_b', 's6', (990, 845, 1056, 940)),
    ('plush_kitty', 's6', (852, 558, 945, 672)),
    ('plush_miffy', 's6', (968, 545, 1056, 672)),
    # --- sheet 7: world, landmarks, pets ---
    ('palm_grove', 's7', (172, 378, 366, 588)),
    ('lifeguard_stand', 's7', (388, 525, 502, 660)),
    ('surfboards', 's7', (505, 568, 556, 652)),
    ('lighthouse', 's7', (12, 385, 232, 642)),
    ('miniso', 's7', (603, 338, 822, 484)),
    ('home_house', 's7', (868, 338, 1066, 486)),
    ('cottage', 's7', (605, 520, 722, 652)),
    ('pet_golden', 's7', (688, 212, 785, 308)),
    ('pet_corgi', 's7', (922, 222, 996, 308)),
    ('pet_bunny', 's7', (1010, 232, 1066, 306)),
    # --- sheet 9: starter furniture, wall decor, micro assets ---
    ('lamp_floor', 's9', (55, 95, 215, 328)),
    ('bed_wood', 's9', (200, 80, 556, 336)),
    ('bookshelf_small', 's9', (590, 85, 806, 322)),
    ('plant_floor', 's9', (878, 85, 1026, 326)),
    ('wreath_holiday', 's9', (85, 485, 222, 632)),
    ('string_lights', 's9', (305, 455, 506, 626)),
    ('print_palm', 's9', (580, 515, 650, 646)),
    ('print_coffee', 's9', (655, 490, 725, 616)),
    ('print_sunset', 's9', (730, 460, 802, 586)),
    ('shelf_plant', 's9', (865, 455, 982, 562)),
    ('shelf_books', 's9', (915, 570, 1032, 646)),
    ('latte_gold', 's9', (65, 795, 172, 892)),
    ('pastry_trio', 's9', (215, 780, 346, 888)),
    # --- sheet 2: seasonal wall decor ---
    ('wreath_xmas', 's2', (18, 768, 192, 948)),
    ('garland_stars', 's2', (200, 800, 458, 925)),
    ('wreath_spring', 's2', (828, 712, 952, 790)),
    ('garland_spring', 's2', (828, 788, 952, 836)),
    ('wreath_summer', 's2', (993, 712, 1097, 790)),
    ('garland_summer', 's2', (993, 788, 1097, 836)),
    ('wreath_autumn', 's2', (1150, 712, 1264, 790)),
    ('garland_autumn', 's2', (1150, 788, 1264, 836)),
    ('wreath_winter', 's2', (1295, 712, 1420, 790)),
    ('garland_winter', 's2', (1295, 788, 1420, 836)),
    # --- sheet 11: companions in outfits, camp scene, RV, camping props ---
    ('kitty_o1', 's11', (38, 98, 118, 192), [(30, 95, 55, 115)]),
    ('kitty_o2', 's11', (38, 230, 118, 318), [(25, 228, 55, 252)]),
    ('kitty_o4', 's11', (433, 230, 512, 322), [(420, 228, 445, 252)]),
    ('kitty_picnic', 's11', (252, 222, 398, 322), [(250, 225, 275, 250)]),
    ('miffy_sweater', 's11', (583, 90, 662, 202), [(570, 90, 590, 112)]),
    ('miffy_raincoat', 's11', (783, 90, 862, 217)),
    ('miffy_boots', 's11', (983, 226, 1066, 352), [(970, 228, 992, 252)]),
    ('camp_site', 's11', (572, 405, 856, 692), [(572, 408, 606, 434)]),
    ('snoopy_o1', 's11', (848, 395, 948, 538), [(846, 408, 868, 432)]),
    ('snoopy_o2', 's11', (968, 395, 1066, 542), [(966, 408, 990, 432)]),
    ('snoopy_o3', 's11', (866, 545, 950, 678), [(864, 548, 888, 572)]),
    ('snoopy_o4', 's11', (970, 548, 1066, 678), [(968, 548, 992, 572)]),
    ('rv_a', 's11', (68, 385, 238, 528)),
    ('rv_b', 's11', (278, 385, 452, 522)),
    ('lantern_camp', 's11', (458, 745, 512, 815)),
    ('lantern_soft', 's11', (533, 740, 592, 815)),
    ('lantern_oil', 's11', (608, 745, 668, 815)),
    ('sleeping_bag_a', 's11', (703, 753, 782, 812)),
    ('sleeping_bag_b', 's11', (793, 753, 868, 812)),
    ('sleeping_bag_pink', 's11', (443, 840, 522, 905)),
    ('mugs_enamel', 's11', (533, 843, 610, 904)),
    ('coffee_pot', 's11', (653, 840, 702, 902)),
    ('camp_percolator', 's11', (723, 843, 788, 905)),
    ('firewood', 's11', (798, 848, 868, 905)),
    ('cooler', 's11', (903, 743, 982, 822)),
    ('radio', 's11', (998, 743, 1062, 812)),
    ('camp_stove', 's11', (916, 838, 988, 905)),
    ('camp_pan', 's11', (988, 853, 1062, 905)),
    # --- sheet 10: RV interior parts and cozy items ---
    ('camp_chair_pink', 's10', (568, 780, 652, 872)),
    ('camp_chair_blue', 's10', (646, 783, 730, 882)),
    ('bedding_cozy', 's10', (178, 758, 328, 868)),
    ('plant_rack', 's10', (473, 763, 552, 882)),
    ('books_blanket', 's10', (818, 838, 890, 897)),
    ('pet_bed', 's10', (908, 843, 978, 897)),
    ('laundry_basket', 's10', (983, 843, 1062, 902)),
    ('kitchenette', 's10', (30, 535, 178, 652)),
    ('dinette_seating', 's10', (322, 528, 492, 648)),
    ('cabinet_shelving', 's10', (643, 508, 748, 658)),
    ('bathroom_module', 's10', (503, 498, 628, 652)),
    # --- sheet 12: downtown shops, stands, street props, townsfolk ---
    ('shop_bookstore', 's12', (28, 112, 218, 312)),
    ('shop_bistro', 's12', (262, 108, 472, 308)),
    ('shop_florist', 's12', (148, 260, 326, 442), [(276, 420, 332, 448)]),
    ('shop_toy', 's12', (450, 220, 642, 422)),
    ('stand_news', 's12', (728, 110, 832, 248)),
    ('stand_hotdog', 's12', (908, 98, 1042, 248)),
    ('stand_art', 's12', (703, 283, 842, 422)),
    ('board_message', 's12', (912, 273, 1028, 422)),
    ('street_lamp_a', 's12', (32, 508, 92, 702)),
    ('street_lamp_b', 's12', (103, 510, 172, 702)),
    ('street_lamp_c', 's12', (176, 505, 228, 702)),
    ('street_lamp_d', 's12', (238, 508, 298, 702)),
    ('bench_a', 's12', (313, 503, 418, 602)),
    ('bench_b', 's12', (426, 503, 528, 598)),
    ('bench_c', 's12', (316, 596, 422, 697)),
    ('bench_d', 's12', (426, 596, 528, 697)),
    ('planter_pot', 's12', (543, 506, 607, 582)),
    ('planter_box_a', 's12', (613, 498, 707, 602)),
    ('plant_tall', 's12', (538, 573, 612, 697)),
    ('planter_box_b', 's12', (613, 588, 707, 702)),
    ('phone_booth', 's12', (733, 503, 824, 702)),
    ('bus_sign', 's12', (833, 546, 880, 702)),
    ('clock_post', 's12', (878, 503, 947, 697)),
    ('wall_clock', 's12', (953, 508, 1052, 617)),
    ('bin_a', 's12', (953, 623, 1007, 697)),
    ('bin_b', 's12', (1003, 623, 1062, 697)),
    ('npc_grandma', 's12', (483, 752, 562, 902)),
    ('npc_photographer', 's12', (573, 748, 647, 907)),
    ('npc_woman', 's12', (678, 748, 742, 907)),
    ('npc_hat', 's12', (768, 748, 832, 907)),
    # --- sheet 13: boardwalk tiles, beach shops and props ---
    ('bw_light', 's13', (22, 62, 202, 152)),
    ('bw_light2', 's13', (225, 62, 402, 152)),
    ('bw_coral', 's13', (427, 62, 604, 152)),
    ('bw_dark', 's13', (125, 136, 300, 234)),
    ('bw_brown', 's13', (25, 198, 202, 294)),
    ('bw_green', 's13', (125, 260, 300, 364)),
    ('bw_coral2', 's13', (325, 260, 502, 362)),
    ('bw_sand', 's13', (427, 322, 607, 428), [(520, 420, 612, 450)]),
    ('shop_surf', 's13', (688, 62, 862, 222)),
    ('shop_icecream', 's13', (888, 68, 1052, 226)),
    ('stand_coffee', 's13', (688, 262, 812, 422)),
    ('shop_souvenir', 's13', (862, 262, 1052, 422)),
    ('lifeguard_red', 's13', (32, 508, 158, 702)),
    ('surfboard_rack', 's13', (178, 558, 297, 702)),
    ('surfboard_stack', 's13', (302, 498, 427, 702)),
    ('volleyball_net', 's13', (452, 488, 697, 697)),
    ('beach_set', 's13', (478, 742, 642, 897)),
    ('souvenir_display', 's13', (703, 762, 812, 902)),
    ('seating_cluster', 's13', (852, 748, 1052, 888)),
    # --- sheet 14: regions and their props ---
    ('region_farm', 's14', (22, 112, 518, 458)),
    ('region_mountain', 's14', (668, 88, 1062, 452)),
    ('campus_buildings', 's14', (28, 485, 438, 705)),
    ('greenhouse_domes', 's14', (435, 488, 722, 692)),
    ('farm_tools', 's14', (478, 112, 652, 208)),
    ('crate_veg', 's14', (533, 203, 642, 258)),
    ('orange_tree', 's14', (523, 343, 572, 428)),
    ('telescope', 's14', (985, 463, 1052, 548)),
    ('hiking_poles', 's14', (922, 473, 958, 548)),
    ('golf_cart', 's14', (862, 612, 952, 692)),
    ('vertical_farm', 's14', (972, 583, 1052, 692)),
    # --- sheet 30: houses and towers ---
    ('house_terracotta', 's30', (30, 572, 212, 738)),
    ('house_bluedoor', 's30', (222, 572, 390, 738)),
    ('house_pink', 's30', (400, 572, 545, 738)),
    ('house_balcony', 's30', (575, 572, 752, 738)),
    ('house_barn', 's30', (35, 778, 207, 938)),
    ('house_windmill', 's30', (222, 772, 382, 928)),
    ('house_coastal', 's30', (400, 778, 568, 942)),
    ('house_modern', 's30', (578, 778, 748, 942)),
    ('tower_coastal', 's30', (778, 578, 962, 832)),
    ('tower_pastel', 's30', (965, 578, 1142, 832)),
    ('tower_garden', 's30', (1148, 578, 1328, 832)),
    ('tower_city', 's30', (1332, 568, 1518, 832)),
    ('town_fountain', 's30', (1412, 905, 1498, 978)),
    # --- sheet 29: trees, palms, beach props ---
    ('tree_round', 's29', (38, 402, 182, 592)),
    ('tree_pine', 's29', (222, 402, 350, 592)),
    ('tree_blossom', 's29', (383, 408, 524, 592)),
    ('tree_maple', 's29', (548, 412, 692, 592)),
    ('tree_snowpine', 's29', (712, 402, 858, 592)),
    ('palm_short', 's29', (42, 738, 172, 888)),
    ('palm_medium', 's29', (202, 738, 342, 888)),
    ('palm_tall', 's29', (362, 728, 502, 892)),
    ('umbrella_pink', 's29', (542, 742, 702, 902)),
    ('umbrella_blue', 's29', (712, 742, 868, 908)),
    ('sandcastle', 's29', (898, 778, 1022, 888)),
    ('rowboat_sand', 's29', (1048, 778, 1212, 882)),
    # --- sheet 28: boats, lighthouse, pier ends ---
    ('sail_fr', 's28', (29, 151, 113, 239)),
    ('sail_fl', 's28', (127, 151, 211, 239)),
    ('sail_br', 's28', (225, 151, 310, 239)),
    ('sail_bl', 's28', (324, 151, 408, 239)),
    ('fish_fr', 's28', (29, 409, 113, 481)),
    ('fish_fl', 's28', (127, 409, 211, 481)),
    ('fish_br', 's28', (225, 409, 310, 481)),
    ('fish_bl', 's28', (324, 409, 408, 481)),
    ('dinghy_a', 's28', (28, 645, 130, 698)),
    ('dinghy_b', 's28', (138, 642, 236, 700)),
    ('lighthouse_n', 's28', (452, 148, 538, 284)),
    ('lighthouse_e', 's28', (650, 148, 738, 284)),
    ('pier_end_a', 's28', (876, 148, 1050, 266)),
    ('pier_end_b', 's28', (1060, 148, 1236, 266)),
    # --- sheet 27: mountains, pines, trail, cabin, waterfall ---
    ('mountain_a', 's27', (28, 92, 366, 332)),
    ('mountain_b', 's27', (386, 88, 682, 256)),
    ('pine_a', 's27', (732, 128, 830, 252)),
    ('pine_b', 's27', (844, 138, 926, 252)),
    ('pine_snow', 's27', (930, 148, 978, 238)),
    ('pine_c', 's27', (984, 142, 1062, 252)),
    ('pines_cluster_a', 's27', (722, 318, 822, 442)),
    ('pines_cluster_b', 's27', (834, 312, 946, 442)),
    ('pines_cluster_c', 's27', (956, 328, 1062, 442)),
    ('cabin_close', 's27', (458, 412, 676, 608)),
    ('waterfall_big', 's27', (478, 676, 664, 882)),
    ('trail_a', 's27', (24, 478, 212, 612)),
    ('trail_b', 's27', (24, 718, 228, 882)),
    # --- avatars (static, from the overview sheet) ---
    ('rachel_front', 's1', (803, 58, 880, 200)),
    ('rachel_side', 's1', (878, 58, 950, 200)),
    ('rachel_back', 's1', (948, 58, 1014, 200)),
]

# On-screen width in px at zoom 1 (one tile is 64 px wide). Sprites are stored at 2x this for crispness.
DISPLAY_W = {
    'house_terracotta': 112, 'house_bluedoor': 108, 'house_pink': 100, 'house_balcony': 112, 'house_barn': 108,
    'house_windmill': 100, 'house_coastal': 108, 'house_modern': 108,
    'tower_coastal': 112, 'tower_pastel': 108, 'tower_garden': 112, 'tower_city': 112, 'town_fountain': 56,
    'tree_round': 46, 'tree_pine': 38, 'tree_blossom': 46, 'tree_maple': 46, 'tree_snowpine': 40,
    'palm_short': 40, 'palm_medium': 42, 'palm_tall': 44, 'umbrella_pink': 52, 'umbrella_blue': 50,
    'sandcastle': 36, 'rowboat_sand': 54,
    'sail_fr': 76, 'sail_fl': 76, 'sail_br': 76, 'sail_bl': 76, 'fish_fr': 70, 'fish_fl': 70, 'fish_br': 70, 'fish_bl': 70,
    'dinghy_a': 52, 'dinghy_b': 52, 'lighthouse_n': 96, 'lighthouse_e': 96, 'pier_end_a': 76, 'pier_end_b': 76,
    'mountain_a': 520, 'mountain_b': 440,
    'pine_a': 34, 'pine_b': 32, 'pine_snow': 22, 'pine_c': 32, 'pines_cluster_a': 52, 'pines_cluster_b': 56, 'pines_cluster_c': 54,
    'cabin_close': 110, 'waterfall_big': 90, 'trail_a': 90, 'trail_b': 100,
    'shop_bookstore': 110, 'shop_bistro': 110, 'shop_florist': 100, 'shop_toy': 110, 'stand_news': 56,
    'stand_hotdog': 64, 'stand_art': 70, 'board_message': 64, 'street_lamp_a': 20, 'street_lamp_b': 24,
    'street_lamp_c': 20, 'street_lamp_d': 24, 'bench_a': 46, 'bench_b': 46, 'bench_c': 46, 'bench_d': 46,
    'planter_pot': 28, 'planter_box_a': 44, 'plant_tall': 34, 'planter_box_b': 44, 'phone_booth': 40,
    'bus_sign': 20, 'clock_post': 28, 'wall_clock': 36, 'bin_a': 22, 'bin_b': 22,
    'npc_grandma': 30, 'npc_photographer': 30, 'npc_woman': 28, 'npc_hat': 28,
    'bw_light': 66, 'bw_light2': 66, 'bw_coral': 66, 'bw_dark': 66, 'bw_brown': 66, 'bw_green': 66,
    'bw_coral2': 66, 'bw_sand': 66, 'shop_surf': 90, 'shop_icecream': 74, 'stand_coffee': 64,
    'shop_souvenir': 100, 'lifeguard_red': 60, 'surfboard_rack': 44, 'surfboard_stack': 50,
    'volleyball_net': 110, 'beach_set': 76, 'souvenir_display': 40, 'seating_cluster': 90,
    'region_farm': 300, 'region_mountain': 260, 'campus_buildings': 220, 'greenhouse_domes': 170,
    'farm_tools': 40, 'crate_veg': 30, 'orange_tree': 28, 'telescope': 26, 'hiking_poles': 14,
    'golf_cart': 40, 'vertical_farm': 36,
    'lamp_floor': 34, 'bed_wood': 100, 'bookshelf_small': 50, 'plant_floor': 40, 'wreath_holiday': 34,
    'string_lights': 56, 'print_palm': 22, 'print_coffee': 22, 'print_sunset': 24, 'shelf_plant': 34,
    'shelf_books': 34, 'latte_gold': 28, 'pastry_trio': 34, 'wreath_xmas': 36, 'garland_stars': 56,
    'wreath_spring': 34, 'garland_spring': 56, 'wreath_summer': 34, 'garland_summer': 56,
    'wreath_autumn': 34, 'garland_autumn': 56, 'wreath_winter': 34, 'garland_winter': 56,
    'kitty_o1': 32, 'kitty_o2': 32, 'kitty_o4': 32, 'kitty_picnic': 76, 'miffy_sweater': 30,
    'miffy_raincoat': 30, 'miffy_boots': 30, 'camp_site': 140, 'snoopy_o1': 34, 'snoopy_o2': 34,
    'snoopy_o3': 34, 'snoopy_o4': 32, 'rv_a': 120, 'rv_b': 120, 'lantern_camp': 20, 'lantern_soft': 20,
    'lantern_oil': 20, 'sleeping_bag_a': 34, 'sleeping_bag_b': 34, 'sleeping_bag_pink': 34,
    'mugs_enamel': 26, 'coffee_pot': 20, 'camp_percolator': 22, 'firewood': 28, 'cooler': 34, 'radio': 28,
    'camp_stove': 28, 'camp_pan': 32, 'camp_chair_pink': 36, 'camp_chair_blue': 36, 'bedding_cozy': 70,
    'plant_rack': 34, 'books_blanket': 28, 'pet_bed': 34, 'laundry_basket': 30, 'kitchenette': 70,
    'dinette_seating': 80, 'cabinet_shelving': 56, 'bathroom_module': 56,
    'floor_wood': 66, 'wall_single': 36, 'wall_corner': 60, 'wall_window': 43, 'wall_door': 38,
    'bed_gingham': 100, 'nightstand': 44, 'chair_sage': 40, 'mug': 22, 'xmas_tree': 44,
    'blanket_red': 56, 'blanket_spring': 50, 'blanket_summer': 50, 'blanket_autumn': 50, 'blanket_winter': 50,
    'tree_spring': 38, 'tree_summer': 38, 'tree_autumn': 38, 'tree_winter': 40,
    'cafe_exterior': 120, 'wooden_chair_a': 34, 'wooden_chair_b': 34, 'cushion_set': 100,
    'round_table_set': 90, 'square_table_set': 100, 'bookshelf_cafe': 44, 'counter_pastry': 150,
    'food_matcha': 28, 'food_tray': 32, 'food_cake_a': 28, 'food_cake_b': 28, 'food_slice': 28,
    'food_croissant': 30, 'food_display': 32, 'food_macarons': 30, 'food_loaf': 30, 'food_bread': 28,
    'plant_a': 30, 'plant_b': 28, 'plant_snake': 26, 'lamp': 22, 'menu_sign': 24, 'suitcase': 28,
    'couch_sectional': 150, 'pastry_case': 100, 'bread_shelf': 84, 'menu_stand_a': 26, 'menu_stand_b': 28,
    'plush_kitty': 34, 'plush_miffy': 32, 'palm_grove': 100, 'lifeguard_stand': 76, 'surfboards': 28,
    'lighthouse': 130, 'miniso': 130, 'home_house': 130, 'cottage': 80,
    'pet_golden': 46, 'pet_corgi': 34, 'pet_bunny': 22,
    'rachel_front': 31, 'rachel_side': 29, 'rachel_back': 27,
}
WALK_SCALE = 0.85  # james walk frames are 80x134 -> 68x114, drawn at half size in game

# James: 4 directions x 4 frames from the walking cycle sheet. Fixed boxes keep feet aligned.
WALK_ROWS = [(64, 'front'), (200, 'back'), (336, 'left'), (482, 'right')]
WALK_COLS = [155, 260, 365, 466]
WALK_W, WALK_H = 80, 134


def estimate_bg(arr):
    border = np.concatenate([arr[0], arr[-1], arr[:, 0], arr[:, -1]]).reshape(-1, 3)
    return np.median(border, axis=0)


TOL = {k: 7 for k in ['sail_fr', 'sail_fl', 'sail_br', 'sail_bl', 'fish_fr', 'fish_fl', 'fish_br', 'fish_bl']}


def cut(sheet, box, erase=(), tol=14):
    im = sheet.crop(box).convert('RGB')
    arr = np.array(im).astype(np.int16)
    bg = estimate_bg(arr)
    for (ex0, ey0, ex1, ey1) in erase:
        arr[max(0, ey0 - box[1]):max(0, ey1 - box[1]), max(0, ex0 - box[0]):max(0, ex1 - box[0])] = bg
    dist = np.sqrt(((arr - bg) ** 2).sum(axis=2))
    near = dist < tol
    labels, n = ndimage.label(near)
    remove = np.zeros_like(near)
    h, w = near.shape
    edge = set(labels[0]) | set(labels[-1]) | set(labels[:, 0]) | set(labels[:, -1])
    sizes = ndimage.sum(near, labels, range(n + 1))
    for lab in range(1, n + 1):
        if lab in edge or sizes[lab] > 90:  # edge background, or enclosed gaps like chair legs
            remove |= labels == lab
    # soft edge: grow the removed area 1px then feather
    alpha = (~remove).astype(float)
    alpha = ndimage.binary_opening(alpha > 0.5, iterations=1).astype(float)
    # drop leftover specks (stray text) that are not the main sprite
    comp, cn = ndimage.label(alpha > 0.5)
    if cn > 1:
        csz = ndimage.sum(alpha > 0.5, comp, range(1, cn + 1))
        biggest = csz.max()
        keep = np.zeros_like(alpha, dtype=bool)
        for i, s in enumerate(csz, start=1):
            if s >= biggest * 0.08:
                keep |= comp == i
        alpha = keep.astype(float)
    # Defringe: the sheet background (cream) bleeds into the outermost pixels. Recolor light edge
    # pixels from the nearest solid interior pixel, so no pale halo shows on dark backgrounds.
    mask = alpha > 0.5
    core = ndimage.binary_erosion(mask, iterations=2)
    if core.any():
        _, idx = ndimage.distance_transform_edt(~core, return_indices=True)
        bleed = arr[idx[0], idx[1]]
        lighter = arr.mean(axis=2) > bleed.mean(axis=2) + 12  # only fix pixels paler than their neighbours
        fix = mask & ~core & lighter
        arr = np.where(fix[..., None], bleed, arr)
    alpha = ndimage.gaussian_filter(alpha, 0.6)
    out = np.dstack([arr.clip(0, 255).astype(np.uint8), (alpha * 255).astype(np.uint8)])
    img = Image.fromarray(out, 'RGBA')
    bbox = img.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
    return img.crop(bbox) if bbox else img


def save_small(img, path):
    # 256 colour PNG with alpha: cartoon art loses nothing visible and files shrink by about half
    try:
        img.quantize(colors=256, method=Image.FASTOCTREE, dither=Image.NONE).save(path, optimize=True)
    except Exception:
        img.save(path, optimize=True)


def main():
    os.makedirs(OUT, exist_ok=True)
    sheets = {k: Image.open(os.path.join(SRC, v)).convert('RGB') for k, v in SHEETS.items()}
    entries = []
    for item in SPRITES:
        key, sk, box = item[0], item[1], item[2]
        erase = item[3] if len(item) > 3 else ()
        img = cut(sheets[sk], box, erase, TOL.get(key, 14))
        dw = DISPLAY_W[key]
        target = dw * 2
        if img.width > target:
            img = img.resize((target, round(img.height * target / img.width)), Image.LANCZOS)
        save_small(img, os.path.join(OUT, key + '.png'))
        entries.append({'key': key, 'file': key + '.png', 'w': img.width, 'h': img.height, 'dw': dw})
    # walk sheet: 4 cols x 4 rows, every frame the same size, bottom aligned
    sheet2 = sheets['s2']
    atlas = Image.new('RGBA', (WALK_W * 4, WALK_H * 4), (0, 0, 0, 0))
    for r, (y0, _name) in enumerate(WALK_ROWS):
        for c, x0 in enumerate(WALK_COLS):
            tile = cut(sheet2, (x0, y0, x0 + WALK_W, y0 + WALK_H))
            ox = (WALK_W - tile.width) // 2
            oy = WALK_H - tile.height
            atlas.paste(tile, (c * WALK_W + ox, r * WALK_H + oy), tile)
    fw, fh = round(WALK_W * WALK_SCALE), round(WALK_H * WALK_SCALE)
    atlas = atlas.resize((fw * 4, fh * 4), Image.LANCZOS)
    save_small(atlas, os.path.join(OUT, 'james_walk.png'))
    ts = ['// Generated by tools/slice_sprites.py. Do not edit by hand.',
          'export const SPRITES = ' + json.dumps(entries, indent=2) + ' as const;', '',
          f'export const WALK_SHEET = {{ key: "james_walk", file: "james_walk.png", frameWidth: {fw}, frameHeight: {fh}, rows: ["front", "back", "left", "right"] }} as const;', '']
    with open(os.path.join(ROOT, 'src', 'game', 'spriteList.ts'), 'w') as f:
        f.write('\n'.join(ts))
    print('wrote', len(entries), 'sprites + walk sheet')


def make_world_map():
    # the zoomed out world map poster, without the character and UI panels underneath it
    im = Image.open(os.path.join(SRC, 'sheet15_world_map.jpg')).convert('RGB').crop((0, 0, 1085, 690))
    im.save(os.path.join(ROOT, 'public', 'assets', 'world_map.jpg'), quality=82, optimize=True)


if __name__ == '__main__':
    make_world_map()
    sys.exit(main())
