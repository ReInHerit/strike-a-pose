# ReInHerit Strike-a-pose

This application is part of the **ReInHerit Toolkit**.

![ReInHerit Strike-a-pose logo](Strike-a-pose_logo.jpg "ReInHerit Strike-a-pose logo")


**Gamification** is the process of exploiting strategies and game dynamics into scenarios that are not a game. 
It has already been proved to be useful to enhance skills and competences in a variety of domains such as marketing, industry training and entertainment.
Also cultural heritage can benefit from a gamification approach which represents an opportunity to **engage visitors** to museums contents through the design of more entertaining, social and challenging digital learning scenarios, to help museums to move from the traditional “look and do not touch” toward a “play and interact” approach. 

Strike-a-pose is a web application which performs analysis and evaluation of human poses compared to poses present in famous paintings or statues. 
The user is challenged to reproduce in sequence the poses of some artworks from the museum's collections. 
Once all the poses have been matched, the application allows the user to **generate a video** that can be saved for any social sharing and provide info on the artworks. 
The video shows the user matching process and the overall interactive experience lived at the museum.

This app won a Best Demo Honorable Mention award at ACM Multimedia 2022, the foremost conference on multimedia.


## System set-up
### Prerequisites
In order to run this demo you need these software installed on your computer:
- [Docker](https://docs.docker.com/get-docker/)
- [Docker-compose](https://docs.docker.com/compose/install/)
- Python 3.10 (or higher)
#### email setup
To send emails to the users, the system needs to be configured with a valid Gmail account. Then, you will need to generate an App Password by following the instructions provided in the first point on this link: https://www.interviewqs.com/blog/py-email.

After generating the App Password, you will need to enter it, along with your email address, into a copy of the `back-end/.env_template` file. Additionally, make sure to remove the **_template** part of the file name, so the updated file should be named ___.env___. This configuration file, .env, will then be used by the application to authenticate with the email service.
#### flask secret key setup
To generate a secret key for the flask application, in a console navigate to strike-a-pose/back-end/static/utility/ then use the following command:
```
python generate_secret_key.py
```
Then copy the generated key and paste it in the file  .env file generated above, in the variable SECRET_KEY.

#### Web domain setup

If a domain with HTTPS is available simply use the standalone Dockerfile. E.g. that Dockerfile allows to deploy the app on Heroku.
Otherwise use the docker-compose approach that spins a docker container with an nginx server and a custom SSL certificate that exposes the docker with Flask and app as HTTPS to access the camera through the web browser.
In this second option the operation is a bit complex, as follows.

Add the following line to the `/etc/hosts` file of the computer where the docker containers are running:

```
# Added for Strike-a-pose project
127.0.0.1 strikeapose.it
# end
```
To change the web domain change the occurrences of the domain in the following files:

- `Dockerfile-nginx`
- `nginx.conf`
- `app.py`
- `start.js`
- `end.js`
- `config.js`

while the other computers/mobile devices that connect to the server must be able to resolve its domain (e.g. changing their /etc/hosts file to
point to the server IP address), as in:

```
# Added for Strike-a-pose project
<SERVER_IP> strikeapose.it
# End
```
**<SERVER_IP>** is the IP address of the computer where the containers are executed.

#### Superuser generation
We need a superuser to manage the database. To generate it:
1) open `back-end/superuser` with your preferred IDE, find the following lines: 
```
superuser = User(
        username='superadmin',
        email='superadmin@example.com',  # Set a unique and non-null email
        is_superuser=True,
        registered=True,  
        confirmed=True,  
    )
superuser.set_password('superadminpassword')
```
then substitute ___superadmin___, ___superadmin@example.com___ and ___superadminpassword___ with your desired username, email and password.

2) in the console navigate to `back-end/` folder then use the following command:
```
python superuser.py
```

### Docker setup

Run Docker-compose:

```
docker-compose build
docker-compose up
```
or to execute it in detach mode:
```
docker compose up -d
```

[//]: # (Upon the first docker-compose execution initialize the database running the *reset.py* script)

[//]: # (Execute again the script if you want to restart again the system &#40;eliminating the registered users&#41;.)

[//]: # (Use the following:)

[//]: # (```)

[//]: # (<user>@<host>:~$ docker container exec -it flask /bin/bash)

[//]: # (root@<CONTAINER-ID>:/usr/src/app# python reset.py)

[//]: # (...)

[//]: # (root@<CONTAINER-ID>:/usr/src/app# exit)

[//]: # (```)

### Browse to the application
Open a web browser and go to the address: https://strikeapose.it. 
If security warnings appear, ignore them and proceed to the website.

### To change the artworks that are shown in the system, follow the following steps:
1. click on the ___ADMIN___ button in the top left corner of the screen. You'll be redirected to the admin page;
2. signin with the superuser credentials;
3. now you can add, or delete the artworks in the database using the respective buttons:
- ADD: a popup will appear, asking you to insert the name of the author name, artwork name, the category type (half bust or full length) and the image of the artwork. Clicking on Choose File you will be asked to select an image from your hard disk. The image must be a .jpg or .png file. Then click on Add Artwork to add it to the database. The image will be saved in the category's corresponding folder `back-end/static/assets/\<category\>` (e.g. `back-end/static/assets/halfBust` for half-length pose and `back-end/static/assets/fullLength` for full-length pose); 
- DELETE: click on the button corresponding to the row of the artwork you want to delete. A popup will appear, asking you to confirm the deletion. Click on Delete to confirm the deletion. 

[//]: # (## Turning on skeleton view)

[//]: # (To show the skeleton &#40;for debugging or to ease the game, user tests show how much people appreciate it&#41; set the *DEBUG* variable to true in the file *back-end/static/js/scripts/config.js*)

[//]: # ()
[//]: # (```)

[//]: # (static DEBUG = true;)

[//]: # (```)

## Citation

If you use this software in your work please cite:

```
@inproceedings{acmmm-22,
	author = {Donadio, Maria Giovanna and Principi, Filippo and Ferracani, Andrea and Bertini, Marco and Del Bimbo, Alberto},
	booktitle = {Proc. of ACM International Conference on Multimedia (ACM MM)},
	doi = {10.1145/3503161.3547744},
	isbn = {9781450392037},
	keywords = {gamification, face pose, cultural heritage, body pose},
	location = {Lisboa, Portugal},
	numpages = {3},
	pages = {7000--7002},
	publisher = {Association for Computing Machinery},
	series = {MM '22},
	title = {Engaging Museum Visitors with Gamification of Body and Facial Expressions},
	url = {https://doi.org/10.1145/3503161.3547744},
	year = {2022},
	bdsk-url-1 = {https://doi.org/10.1145/3503161.3547744}
}
```

## Acknowledgements
This work was partially supported by the European Commission under European Horizon 2020 Programme, grant number 101004545 - [ReInHerit](https://www.reinherit.eu).