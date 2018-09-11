import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  properties = [];
  name: string;
  genres: string[] = [];
  uid: string;
  oauth: string;
  availableGenres: string[] = [];
  selection: string;
  defaultInactive = ['duration_ms'];

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute) { }

  ngOnInit() {
    this.route.fragment.subscribe( f => {
      const match = this.route.snapshot.fragment.match(/^(.*?)&/);
      if (match && match.length) {
        this.oauth = match[0].replace('access_token=', '');
      }

      if (this.oauth && this.oauth.length) {
        const headers = new HttpHeaders()
                .set('Accept', 'application/json')
                .set('Authorization', `Bearer ${this.oauth}`)
                .set('Content-Type', 'application/json');

        this.selectionChanged(localStorage['spotifySelection']);
        localStorage.removeItem('spotifySelection');

        this.http.get('https://api.spotify.com/v1/me', {headers}).subscribe( (m: any) => {
          this.uid = m.id;
        });
        this.http.get('https://api.spotify.com/v1/recommendations/available-genre-seeds', {headers}).subscribe( (r: any) => {
          this.availableGenres = r.genres;
        });
      }
    });
  }

  getMedian( data: any[] ) {
      let median = 0;
      const numsLen = data.length;
      data.sort();

      median = data[Math.round((numsLen - 1) / 2)];

      return median;
  }
  getMean( data: any[] ) {
    let total = 0;
    for (let i = 0; i < data.length; i += 1) {
        total += data[i];
    }
    return total / data.length;
  }

  createPlaylist() {
    if (!this.genres || !this.genres.length) {
      alert('Please select seed and seed genres');
      return;
    }

    if (!this.name || !this.name.length) {
      this.name = new Date().toISOString();
    }
    const headers = new HttpHeaders()
                    .set('Accept', 'application/json')
                    .set('Authorization', `Bearer ${this.oauth}`)
                    .set('Content-Type', 'application/json');

    let params = `?limit=30&seed_genres=${this.genres}&`;
    this.properties.forEach( p => {
      if (p.active) {
        params += `min_${p.key}=${p.min}&max_${p.key}=${p.max}&target_${p.key}=${p.avg}&`;
      }
    });
    params = params.slice(0, -1);

    const uri = 'https://api.spotify.com/v1/recommendations' + params;
    this.http.get(uri, {headers}).subscribe( (s: any) => {
      const trackUris = s.tracks.reduce( (a, c) => a += c.uri + ',', '').slice(0, -1);
      const playlistBody = `{
        "name": "${this.name}",
        "description": "${this.genres}",
        "public": false
      }`;
      this.http.post(`https://api.spotify.com/v1/users/${this.uid}/playlists`, playlistBody, {headers}).subscribe( (p: any) => {
        const id = p.id;
        const songBody = `{ "uris": ${trackUris} }`;
        this.http.post(`https://api.spotify.com/v1/playlists/${id}/tracks?uris=${trackUris}`, songBody, {headers}).subscribe( success => {
          alert('playlist created');
        },
        error => console.log(error));
      });
    },
    error => console.log(error));
  }

  propertyToggle(propIndex) {
    this.properties[propIndex].active = !this.properties[propIndex].active;
  }

  checkboxChecked(event: any, genre: string) {
    const index = this.genres.indexOf(genre);
    if (index < 0 && this.genres.length < 5) {
      this.genres.push(genre);
    } else if (index >= 0) {
      this.genres.splice(index, 1);
    }
  }

  selectionChanged(newValue) {
    this.selection = newValue;
    if (this.oauth) {
      this.properties = [];
      const headers = new HttpHeaders().set('Accept', 'application/json').set('Authorization', `Bearer ${this.oauth}`);
      let uri = newValue === 'favorites' ? 'https://api.spotify.com/v1/me/tracks' : 'https://api.spotify.com/v1/me/player/recently-played';
      uri += '?limit=50';

      const songRequest = this.http.get(uri, {headers});
      songRequest.subscribe( (d: any) => {
        const ids = d.items.reduce((a, c) => a += `${c.track.id},`, '').slice(0, -1);

        this.http.get(`https://api.spotify.com/v1/audio-features?ids=${ids}`, {headers}).subscribe( (r: any) => {
          const props = {};
          r.audio_features.forEach(trackFeats => {
            Object.entries(trackFeats).forEach( ([k, v]) => {
              if (!props[k] ) {
                props[k] = [];
              }
              props[k].push(v);
            });
          });

          Object.entries(props).forEach( ([k, v]: [string, any[]]) => {
            if (v.length && typeof v[0] === 'number') {
              const median = this.getMedian(v);
              const active = this.defaultInactive.every(u => u !== k);
              this.properties.push({
                key: k,
                min: Math.min(...v),
                max: Math.max(...v),
                mean: this.getMean(v),
                median: median,
                avg: median,
                active: active
              });
            }
          });
        },
        error => console.log(error));
      });
    } else {
      localStorage['spotifySelection'] = newValue;
      const currLocation = location;
      const clientid = '0cdeea19b503441f8a7ec2dc06636c1c';
      const scopes = 'user-read-recently-played user-library-read playlist-modify-private';
      const params = `client_id=${clientid}&response_type=token&redirect_uri=${currLocation}&scope=${scopes}`;
      location.href = `https://accounts.spotify.com/authorize?${params}`;
    }
  }
}
