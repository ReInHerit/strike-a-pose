import os
import uuid

import cv2
import numpy as np




if not os.path.exists('static/videos'):
    os.makedirs('static/videos')
video_path = f'static/videos/{uuid.uuid4()}.mp4'
out = cv2.VideoWriter(video_path, cv2.VideoWriter_fourcc(*'mp4v'), 14.0, (1024, 2048))

# Create the sections' heights
title_height = 376
picture_height = 1000
frame_height = 672

# Load and resize the logo image
logo = cv2.imread('C:/Users/arkfil/Desktop/strike-a-pose/back-end/static/assets/logo.png')  # Replace with the actual path to your logo image
logo_aspect_ratio = logo.shape[1] / logo.shape[0]
if logo_aspect_ratio > 1:
    # Landscape (horizontal) logo
    new_logo_width = 200
    new_logo_height = int(new_logo_width / logo_aspect_ratio)
elif logo_aspect_ratio < 1:
    # Portrait (vertical) logo
    new_logo_height = 200
    new_logo_width = int(new_logo_height * logo_aspect_ratio)
else:
    # Square logo
    new_logo_height = 200
    new_logo_width = 200

logo_resized = cv2.resize(logo, (new_logo_width, new_logo_height))

# Create a black background for the title section
title_section = np.zeros((title_height, 1024, 3), np.uint8)
title_section[:] = (0, 0, 0)  # Black background
centered_logo_y = (title_height - new_logo_height) // 2
# Add the logo to the title section
title_section[centered_logo_y:centered_logo_y + new_logo_height, 25:new_logo_width + 25] = logo_resized

# Add the text title using OpenCV
text = 'STRIKE A POSE'
font = cv2.FONT_HERSHEY_SIMPLEX
font_scale = 2
font_color = (255, 255, 255)  # White color
text_size = cv2.getTextSize(text, font, font_scale, 1)[0]
text_x = new_logo_width + 60
text_y = (title_height + text_size[1]) // 2
cv2.putText(title_section, text, (text_x, text_y), font, font_scale, font_color, 1, cv2.LINE_AA)

picture_path = r'C:/Users/arkfil/Desktop/strike-a-pose/back-end/static/assets/halfBust/Salvator_Mundi-Leonardo_da_Vinci.jpg'
img_path = 'C:/Users/arkfil/Desktop/strike-a-pose/back-end/static/assets/La_Scuola_di_Atene-Raffaello_Sanzio.jpg'
# picture = Picture.query.get(int(picture_id))
picture_image = cv2.imread(picture_path)

# Calculate dimensions for the Picture section
picture_aspect_ratio = picture_image.shape[1] / picture_image.shape[0]

if picture_aspect_ratio > 1:
    # Landscape (horizontal) picture
    new_picture_width = 1024
    new_picture_height = int(new_picture_width / picture_aspect_ratio)
else:
    # Portrait (vertical) picture
    new_picture_height = 1000
    new_picture_width = int(new_picture_height * picture_aspect_ratio)

resized_picture_image = cv2.resize(picture_image, (new_picture_width, new_picture_height))
picture_section = np.zeros((1000, 1024, 3), np.uint8)
picture_section[:] = (25, 25, 25)  # Black background
# center resized picture image
centered_height = (1000 - new_picture_height) // 2
centered_width = (1024 - new_picture_width) // 2
picture_section[centered_height:centered_height + new_picture_height, centered_width:centered_width + new_picture_width] = resized_picture_image

img = cv2.imread(img_path)
# img = cv2.imdecode(np.fromstring(file.read(), np.uint8), cv2.IMREAD_COLOR)


resized_frame_image = cv2.resize(img, (1024, 672))

# Combine images
combined_images = np.concatenate((cv2.flip(title_section, 1), picture_section, resized_frame_image), axis=0)
flipped_combined_images = cv2.flip(combined_images, 1)

# Create a black frame for the combined images
black_frame = np.zeros((2048, 1024, 3), np.uint8)

# Calculate positions for pasting images
paste_start_row = (2048 - (title_height + picture_height + frame_height)) // 2
paste_end_row = paste_start_row + title_height + picture_height + frame_height
paste_start_col = 0

# Paste images onto the black frame
black_frame[paste_start_row:paste_end_row, paste_start_col:] = flipped_combined_images
cv2.imwrite('C:/Users/arkfil/Desktop/strike-a-pose/back-end/static/assets/combined_images.jpg', black_frame)
# Write the frame to the video
out.write(black_frame)

out.release()