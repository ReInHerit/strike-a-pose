# ReInHerit Strike-a-pose

This application is part of the **ReInHerit Toolkit**.

**Gamification** is the process of exploiting strategies and game dynamics into scenarios that are not a game. 
It has already been proved to be useful to enhance skills and competences in a variety of domains such as marketing, industry training and entertainment.
Also cultural heritage can benefit from a gamification approach which represents an opportunity to **engage visitors** to museums contents through the design of more entertaining, social and challenging digital learning scenarios, to help museums to move from the traditional “look and do not touch” toward a “play and interact” approach. 

Strike-a-pose is a web application which performs analysis and evaluation of human poses compared to poses present in famous paintings or statues. 
The user is challenged to reproduce in sequence the poses of some artworks from the museum's collections. 
Once all the poses have been matched, the application allows the user to **generate a video** that can be saved for any social sharing and provide info on the artworks. 
The video shows the user matching process and the overall interactive experience lived at the museum.

This app won a Best Demo Honorable Mention award at ACM Multimedia 2022, the foremost conference on multimedia.


## System set-up

### Web domain setup

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
**<SERVER_IP>** è l'indirizzo ip del computer che ha in esecuzione i container docker

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
Upon the first docker-compose execution initialize the database running the *reset.py* script
Execute again the script if you want to restart again the system (eliminating the registered users).
Use the following:
```
<user>@<host>:~$ docker container exec -it flask /bin/bash
root@<CONTAINER-ID>:/usr/src/app# python reset.py
...
root@<CONTAINER-ID>:/usr/src/app# exit
```

### Changing/updating artworks

To change the artworks that are shown in the system, follow the following steps:
1. Download an image containing a half-body or full-body pose
2. Rename the image with the format *\<artwork_name\>-\<artist_name\>\.\<format\>*
   Replacing spaces with the _ character (e.g. *Mona_Lisa-Leonardo_da_Vinci.jpeg*)
3. Insert/Remove the image in the appropriate folder (halfBust folder for half-length pose and fullLength folder for full-length pose) that is located in
   pose/back-end/static/assets/
4. Run the *resetPictures.py* script to update the database with the new images
   ```
   <user>@<host>:~$ docker container exec -it flask /bin/bash
   root@<CONTAINER-ID>:/usr/src/app# python resetPictures.py
   ...
   root@<CONTAINER-ID>:/usr/src/app# exit
   ```

## Turning on skeleton view
To show the skeleton (for debugging or to ease the game, user tests show how much people appreciate it) set the *DEBUG* variable to true in the file *back-end/static/js/scripts/config.js*

```
static DEBUG = true;
```

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